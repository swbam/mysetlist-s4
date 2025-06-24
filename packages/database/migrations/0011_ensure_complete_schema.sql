-- Ensure complete schema - final check for any missing elements

-- Ensure all required extensions are enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Ensure follower_count column exists with correct name
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'artists' 
                   AND column_name = 'follower_count') THEN
        ALTER TABLE artists ADD COLUMN follower_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Ensure all tables have proper updated_at triggers
DO $$
DECLARE
    t record;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name IN (
            'users', 'user_profiles', 'artists', 'artist_stats', 
            'venues', 'shows', 'songs', 'setlists', 'setlist_songs', 
            'votes', 'venue_reviews', 'email_preferences', 'email_queue', 
            'email_logs', 'reports', 'content_moderation'
        )
    LOOP
        -- Check if the table has updated_at column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = t.table_name 
            AND column_name = 'updated_at'
        ) THEN
            -- Create trigger if it doesn't exist
            EXECUTE format('
                CREATE OR REPLACE TRIGGER update_%I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            ', t.table_name, t.table_name);
        END IF;
    END LOOP;
END $$;

-- Ensure show_artists has proper unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'show_artists_show_artist_unique'
    ) THEN
        ALTER TABLE show_artists 
        ADD CONSTRAINT show_artists_show_artist_unique 
        UNIQUE(show_id, artist_id);
    END IF;
END $$;

-- Ensure proper foreign key cascades
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE artist_stats DROP CONSTRAINT IF EXISTS artist_stats_artist_id_fkey;
ALTER TABLE artist_stats 
ADD CONSTRAINT artist_stats_artist_id_fkey 
FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE;

ALTER TABLE show_artists DROP CONSTRAINT IF EXISTS show_artists_show_id_fkey;
ALTER TABLE show_artists 
ADD CONSTRAINT show_artists_show_id_fkey 
FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;

ALTER TABLE show_artists DROP CONSTRAINT IF EXISTS show_artists_artist_id_fkey;
ALTER TABLE show_artists 
ADD CONSTRAINT show_artists_artist_id_fkey 
FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE;

ALTER TABLE setlist_songs DROP CONSTRAINT IF EXISTS setlist_songs_setlist_id_fkey;
ALTER TABLE setlist_songs 
ADD CONSTRAINT setlist_songs_setlist_id_fkey 
FOREIGN KEY (setlist_id) REFERENCES setlists(id) ON DELETE CASCADE;

ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_setlist_song_id_fkey;
ALTER TABLE votes 
ADD CONSTRAINT votes_setlist_song_id_fkey 
FOREIGN KEY (setlist_song_id) REFERENCES setlist_songs(id) ON DELETE CASCADE;

-- Create function for updating trending scores (if not exists)
CREATE OR REPLACE FUNCTION calculate_trending_score(
    view_count INTEGER,
    vote_count INTEGER,
    created_at TIMESTAMP,
    is_featured BOOLEAN DEFAULT false
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    age_hours DOUBLE PRECISION;
    base_score DOUBLE PRECISION;
    time_decay DOUBLE PRECISION;
BEGIN
    -- Calculate age in hours
    age_hours := EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0;
    
    -- Base score from engagement
    base_score := (view_count * 0.1) + (vote_count * 0.5);
    
    -- Add boost for featured content
    IF is_featured THEN
        base_score := base_score * 1.5;
    END IF;
    
    -- Apply time decay (half-life of 48 hours)
    time_decay := POWER(0.5, age_hours / 48.0);
    
    RETURN base_score * time_decay;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job function for updating trending scores
CREATE OR REPLACE FUNCTION update_trending_scores() RETURNS void AS $$
BEGIN
    -- Update show trending scores
    UPDATE shows
    SET trending_score = calculate_trending_score(
        view_count, 
        vote_count, 
        created_at, 
        is_featured
    )
    WHERE status IN ('upcoming', 'ongoing');
    
    -- Update artist trending scores based on recent activity
    UPDATE artists a
    SET trending_score = (
        SELECT COALESCE(SUM(s.trending_score), 0) / GREATEST(COUNT(*), 1)
        FROM shows s
        WHERE s.headliner_artist_id = a.id
        AND s.date >= CURRENT_DATE - INTERVAL '30 days'
    );
END;
$$ LANGUAGE plpgsql;

-- Ensure all RLS is properly configured
DO $$
DECLARE
    t record;
BEGIN
    -- Enable RLS on all user-facing tables
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name IN (
            'users', 'user_profiles', 'votes', 'setlists',
            'email_preferences', 'email_unsubscribes', 'email_queue', 
            'email_logs', 'venue_reviews', 'venue_photos', 
            'venue_insider_tips', 'user_follows_artists', 'reports',
            'moderation_logs', 'user_bans', 'content_moderation',
            'platform_stats', 'admin_notifications'
        )
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.table_name);
    END LOOP;
END $$;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON 
    users, user_profiles, votes, setlists, setlist_songs,
    email_preferences, email_unsubscribes, venue_reviews,
    venue_photos, venue_insider_tips, user_follows_artists,
    reports
TO authenticated;

-- Grant permissions to anon users for public data
GRANT SELECT ON 
    artists, venues, shows, songs, show_artists,
    artist_stats, artist_followers
TO anon;

-- Create helper function for checking user permissions
CREATE OR REPLACE FUNCTION user_has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id 
        AND role = required_role::user_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Final check: Ensure schema_migrations table exists
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    executed_at TIMESTAMP DEFAULT NOW()
);