-- Migration: Fix Data Integrity Issues
-- Description: Adds missing tables, indexes, constraints, and triggers for data consistency

-- 1. Add missing user_follows_artists table
CREATE TABLE IF NOT EXISTS user_follows_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_follows_artists_unique UNIQUE(user_id, artist_id)
);

-- 2. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_artists_trending_score ON artists(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_shows_trending_score ON shows(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_venues_trending_score ON venues(trending_score DESC) WHERE trending_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_follows_artists_user ON user_follows_artists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_artists_artist ON user_follows_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_shows_date_status ON shows(date, status) WHERE status IN ('upcoming', 'ongoing');
CREATE INDEX IF NOT EXISTS idx_votes_composite ON votes(setlist_song_id, vote_type);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_votes ON setlist_songs(net_votes DESC);

-- 3. Fix foreign key constraints with CASCADE
ALTER TABLE setlist_songs 
  DROP CONSTRAINT IF EXISTS setlist_songs_setlist_id_fkey,
  ADD CONSTRAINT setlist_songs_setlist_id_fkey 
    FOREIGN KEY (setlist_id) REFERENCES setlists(id) ON DELETE CASCADE;

ALTER TABLE votes 
  DROP CONSTRAINT IF EXISTS votes_setlist_song_id_fkey,
  ADD CONSTRAINT votes_setlist_song_id_fkey 
    FOREIGN KEY (setlist_song_id) REFERENCES setlist_songs(id) ON DELETE CASCADE;

ALTER TABLE votes
  DROP CONSTRAINT IF EXISTS votes_user_id_fkey,
  ADD CONSTRAINT votes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE setlists
  DROP CONSTRAINT IF EXISTS setlists_show_id_fkey,
  ADD CONSTRAINT setlists_show_id_fkey
    FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;

ALTER TABLE setlists
  DROP CONSTRAINT IF EXISTS setlists_artist_id_fkey,
  ADD CONSTRAINT setlists_artist_id_fkey
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE;

ALTER TABLE show_artists
  DROP CONSTRAINT IF EXISTS show_artists_show_id_fkey,
  ADD CONSTRAINT show_artists_show_id_fkey
    FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;

ALTER TABLE show_artists
  DROP CONSTRAINT IF EXISTS show_artists_artist_id_fkey,
  ADD CONSTRAINT show_artists_artist_id_fkey
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE;

-- 4. Add unique constraints for data integrity
ALTER TABLE artists ADD CONSTRAINT artists_slug_unique UNIQUE (slug) WHERE slug IS NOT NULL;
ALTER TABLE shows ADD CONSTRAINT shows_slug_unique UNIQUE (slug) WHERE slug IS NOT NULL;
ALTER TABLE venues ADD CONSTRAINT venues_slug_unique UNIQUE (slug) WHERE slug IS NOT NULL;
ALTER TABLE songs ADD CONSTRAINT songs_spotify_id_unique UNIQUE (spotify_id) WHERE spotify_id IS NOT NULL;

-- 5. Add check constraints for data validation
ALTER TABLE shows ADD CONSTRAINT shows_date_not_null CHECK (date IS NOT NULL);
ALTER TABLE artists ADD CONSTRAINT artists_name_not_empty CHECK (name != '' AND name IS NOT NULL);
ALTER TABLE venues ADD CONSTRAINT venues_name_not_empty CHECK (name != '' AND name IS NOT NULL);
ALTER TABLE songs ADD CONSTRAINT songs_title_not_empty CHECK (title != '' AND title IS NOT NULL);

-- 6. Create trigger function for automatic vote count updates
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    v_setlist_song_id UUID;
BEGIN
    -- Determine which setlist_song_id to update
    IF TG_OP = 'DELETE' THEN
        v_setlist_song_id := OLD.setlist_song_id;
    ELSE
        v_setlist_song_id := NEW.setlist_song_id;
    END IF;
    
    -- Update the vote counts
    UPDATE setlist_songs 
    SET 
        upvotes = (
            SELECT COUNT(*) 
            FROM votes 
            WHERE setlist_song_id = v_setlist_song_id 
            AND vote_type = 'up'
        ),
        downvotes = (
            SELECT COUNT(*) 
            FROM votes 
            WHERE setlist_song_id = v_setlist_song_id 
            AND vote_type = 'down'
        ),
        net_votes = (
            (SELECT COUNT(*) FROM votes WHERE setlist_song_id = v_setlist_song_id AND vote_type = 'up') -
            (SELECT COUNT(*) FROM votes WHERE setlist_song_id = v_setlist_song_id AND vote_type = 'down')
        ),
        updated_at = NOW()
    WHERE id = v_setlist_song_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for vote count synchronization
DROP TRIGGER IF EXISTS vote_count_sync ON votes;
CREATE TRIGGER vote_count_sync
AFTER INSERT OR UPDATE OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

-- 8. Create function to update artist follower counts
CREATE OR REPLACE FUNCTION update_artist_follower_count()
RETURNS TRIGGER AS $$
DECLARE
    v_artist_id UUID;
BEGIN
    -- Determine which artist to update
    IF TG_OP = 'DELETE' THEN
        v_artist_id := OLD.artist_id;
    ELSE
        v_artist_id := NEW.artist_id;
    END IF;
    
    -- Update the follower count
    UPDATE artists 
    SET 
        follower_count = (
            SELECT COUNT(*) 
            FROM user_follows_artists 
            WHERE artist_id = v_artist_id
        ),
        updated_at = NOW()
    WHERE id = v_artist_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for follower count synchronization
DROP TRIGGER IF EXISTS artist_follower_count_sync ON user_follows_artists;
CREATE TRIGGER artist_follower_count_sync
AFTER INSERT OR DELETE ON user_follows_artists
FOR EACH ROW EXECUTE FUNCTION update_artist_follower_count();

-- 10. Create function to update show counts
CREATE OR REPLACE FUNCTION update_show_counts()
RETURNS TRIGGER AS $$
DECLARE
    v_show_id UUID;
BEGIN
    -- Determine which show to update
    IF TG_OP = 'DELETE' THEN
        v_show_id := OLD.show_id;
    ELSE
        v_show_id := NEW.show_id;
    END IF;
    
    -- Update setlist count
    UPDATE shows 
    SET 
        setlist_count = (
            SELECT COUNT(*) 
            FROM setlists 
            WHERE show_id = v_show_id
        ),
        updated_at = NOW()
    WHERE id = v_show_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger for show counts synchronization
DROP TRIGGER IF EXISTS show_setlist_count_sync ON setlists;
CREATE TRIGGER show_setlist_count_sync
AFTER INSERT OR DELETE ON setlists
FOR EACH ROW EXECUTE FUNCTION update_show_counts();

-- 12. Add trending_score column to venues if missing
ALTER TABLE venues ADD COLUMN IF NOT EXISTS trending_score DOUBLE PRECISION DEFAULT 0;

-- 13. Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_shows_artist_date ON shows(headliner_artist_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_setlists_show_type ON setlists(show_id, type);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_position ON setlist_songs(setlist_id, position);

-- 14. Enable Row Level Security on new table
ALTER TABLE user_follows_artists ENABLE ROW LEVEL SECURITY;

-- 15. Create RLS policies for user_follows_artists
CREATE POLICY "Users can view their own follows" ON user_follows_artists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own follows" ON user_follows_artists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follows" ON user_follows_artists
    FOR DELETE USING (auth.uid() = user_id);

-- 16. Grant permissions
GRANT SELECT ON user_follows_artists TO authenticated;
GRANT INSERT ON user_follows_artists TO authenticated;
GRANT DELETE ON user_follows_artists TO authenticated;

-- 17. Comment the migration
COMMENT ON TABLE user_follows_artists IS 'Tracks which users follow which artists';
COMMENT ON COLUMN user_follows_artists.user_id IS 'Reference to auth.users';
COMMENT ON COLUMN user_follows_artists.artist_id IS 'Reference to artists table';
COMMENT ON INDEX idx_artists_trending_score IS 'Optimizes trending artist queries';
COMMENT ON INDEX idx_shows_trending_score IS 'Optimizes trending show queries';
COMMENT ON INDEX idx_venues_trending_score IS 'Optimizes trending venue queries';
COMMENT ON FUNCTION update_vote_counts IS 'Automatically maintains vote count denormalization';
COMMENT ON FUNCTION update_artist_follower_count IS 'Automatically maintains artist follower count';
COMMENT ON FUNCTION update_show_counts IS 'Automatically maintains show statistics';