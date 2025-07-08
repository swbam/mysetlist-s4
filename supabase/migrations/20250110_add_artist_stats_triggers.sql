-- Artist stats triggers and functions for automatic updates

-- First, ensure artist_stats table exists with all necessary columns
CREATE TABLE IF NOT EXISTS artist_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_shows INTEGER DEFAULT 0,
  upcoming_shows INTEGER DEFAULT 0,
  total_setlists INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  avg_setlist_rating DECIMAL(3,2) DEFAULT 0,
  total_followers INTEGER DEFAULT 0,
  last_show_date DATE,
  next_show_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on artist_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_artist_stats_artist_id ON artist_stats(artist_id);

-- Function to update artist stats when shows change
CREATE OR REPLACE FUNCTION update_artist_stats_from_shows()
RETURNS TRIGGER AS $$
DECLARE
  artist_ids UUID[];
  aid UUID;
BEGIN
  -- Collect all affected artist IDs
  IF TG_OP = 'DELETE' THEN
    artist_ids := ARRAY[OLD.headliner_artist_id];
  ELSIF TG_OP = 'UPDATE' THEN
    artist_ids := ARRAY[OLD.headliner_artist_id, NEW.headliner_artist_id];
  ELSE -- INSERT
    artist_ids := ARRAY[NEW.headliner_artist_id];
  END IF;
  
  -- Also include supporting artists
  IF TG_OP != 'DELETE' THEN
    artist_ids := artist_ids || ARRAY(
      SELECT DISTINCT artist_id FROM show_artists WHERE show_id = NEW.id
    );
  END IF;
  
  -- Update stats for each affected artist
  FOREACH aid IN ARRAY artist_ids LOOP
    INSERT INTO artist_stats (artist_id)
    VALUES (aid)
    ON CONFLICT (artist_id) DO NOTHING;
    
    UPDATE artist_stats
    SET 
      total_shows = (
        SELECT COUNT(*) FROM shows WHERE headliner_artist_id = aid
        UNION ALL
        SELECT COUNT(*) FROM show_artists WHERE artist_id = aid
      ),
      upcoming_shows = (
        SELECT COUNT(*) FROM shows 
        WHERE (headliner_artist_id = aid OR id IN (
          SELECT show_id FROM show_artists WHERE artist_id = aid
        )) AND date >= CURRENT_DATE AND status = 'upcoming'
      ),
      last_show_date = (
        SELECT MAX(date) FROM shows 
        WHERE (headliner_artist_id = aid OR id IN (
          SELECT show_id FROM show_artists WHERE artist_id = aid
        )) AND date <= CURRENT_DATE
      ),
      next_show_date = (
        SELECT MIN(date) FROM shows 
        WHERE (headliner_artist_id = aid OR id IN (
          SELECT show_id FROM show_artists WHERE artist_id = aid
        )) AND date >= CURRENT_DATE AND status = 'upcoming'
      ),
      updated_at = NOW()
    WHERE artist_id = aid;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for shows table
DROP TRIGGER IF EXISTS update_artist_stats_on_show_change ON shows;
CREATE TRIGGER update_artist_stats_on_show_change
  AFTER INSERT OR UPDATE OR DELETE ON shows
  FOR EACH ROW
  EXECUTE FUNCTION update_artist_stats_from_shows();

-- Function to update artist stats when setlists change
CREATE OR REPLACE FUNCTION update_artist_stats_from_setlists()
RETURNS TRIGGER AS $$
DECLARE
  show_record RECORD;
  artist_ids UUID[];
BEGIN
  -- Get the show and artist info
  IF TG_OP = 'DELETE' THEN
    SELECT s.headliner_artist_id, ARRAY_AGG(DISTINCT sa.artist_id) as supporting_artists
    INTO show_record
    FROM shows s
    LEFT JOIN show_artists sa ON sa.show_id = s.id
    WHERE s.id = OLD.show_id
    GROUP BY s.headliner_artist_id;
  ELSE
    SELECT s.headliner_artist_id, ARRAY_AGG(DISTINCT sa.artist_id) as supporting_artists
    INTO show_record
    FROM shows s
    LEFT JOIN show_artists sa ON sa.show_id = s.id
    WHERE s.id = NEW.show_id
    GROUP BY s.headliner_artist_id;
  END IF;
  
  -- Collect all affected artists
  artist_ids := ARRAY[show_record.headliner_artist_id] || COALESCE(show_record.supporting_artists, '{}');
  
  -- Update stats for each artist
  UPDATE artist_stats
  SET 
    total_setlists = (
      SELECT COUNT(DISTINCT sl.id) 
      FROM setlists sl
      JOIN shows s ON s.id = sl.show_id
      WHERE s.headliner_artist_id = artist_stats.artist_id
         OR s.id IN (SELECT show_id FROM show_artists WHERE artist_id = artist_stats.artist_id)
    ),
    updated_at = NOW()
  WHERE artist_id = ANY(artist_ids);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for setlists table
DROP TRIGGER IF EXISTS update_artist_stats_on_setlist_change ON setlists;
CREATE TRIGGER update_artist_stats_on_setlist_change
  AFTER INSERT OR UPDATE OR DELETE ON setlists
  FOR EACH ROW
  EXECUTE FUNCTION update_artist_stats_from_setlists();

-- Function to aggregate vote counts for artists
CREATE OR REPLACE FUNCTION update_artist_vote_stats()
RETURNS TRIGGER AS $$
DECLARE
  artist_ids UUID[];
BEGIN
  -- Get all affected artists through the setlist_song -> setlist -> show -> artist chain
  WITH affected_artists AS (
    SELECT DISTINCT s.headliner_artist_id as artist_id
    FROM setlist_songs ss
    JOIN setlists sl ON sl.id = ss.setlist_id
    JOIN shows s ON s.id = sl.show_id
    WHERE ss.id = COALESCE(NEW.setlist_song_id, OLD.setlist_song_id)
    
    UNION
    
    SELECT DISTINCT sa.artist_id
    FROM setlist_songs ss
    JOIN setlists sl ON sl.id = ss.setlist_id
    JOIN shows s ON s.id = sl.show_id
    JOIN show_artists sa ON sa.show_id = s.id
    WHERE ss.id = COALESCE(NEW.setlist_song_id, OLD.setlist_song_id)
  )
  SELECT ARRAY_AGG(artist_id) INTO artist_ids FROM affected_artists;
  
  -- Update vote counts for affected artists
  UPDATE artist_stats
  SET 
    total_votes = (
      SELECT COUNT(*)
      FROM votes v
      JOIN setlist_songs ss ON ss.id = v.setlist_song_id
      JOIN setlists sl ON sl.id = ss.setlist_id
      JOIN shows s ON s.id = sl.show_id
      WHERE s.headliner_artist_id = artist_stats.artist_id
         OR s.id IN (SELECT show_id FROM show_artists WHERE artist_id = artist_stats.artist_id)
    ),
    avg_setlist_rating = (
      SELECT AVG(
        CASE 
          WHEN v.vote_type = 'up' THEN 1
          WHEN v.vote_type = 'down' THEN -1
          ELSE 0
        END
      )::DECIMAL(3,2)
      FROM votes v
      JOIN setlist_songs ss ON ss.id = v.setlist_song_id
      JOIN setlists sl ON sl.id = ss.setlist_id
      JOIN shows s ON s.id = sl.show_id
      WHERE s.headliner_artist_id = artist_stats.artist_id
         OR s.id IN (SELECT show_id FROM show_artists WHERE artist_id = artist_stats.artist_id)
    ),
    updated_at = NOW()
  WHERE artist_id = ANY(artist_ids);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for votes table
DROP TRIGGER IF EXISTS update_artist_stats_on_vote_change ON votes;
CREATE TRIGGER update_artist_stats_on_vote_change
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_artist_vote_stats();

-- Function to update follower counts
CREATE OR REPLACE FUNCTION update_artist_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE artist_stats
    SET 
      total_followers = (
        SELECT COUNT(*) FROM user_follows_artists WHERE artist_id = OLD.artist_id
      ),
      updated_at = NOW()
    WHERE artist_id = OLD.artist_id;
  ELSE
    -- Ensure artist_stats record exists
    INSERT INTO artist_stats (artist_id)
    VALUES (NEW.artist_id)
    ON CONFLICT (artist_id) DO NOTHING;
    
    UPDATE artist_stats
    SET 
      total_followers = (
        SELECT COUNT(*) FROM user_follows_artists WHERE artist_id = NEW.artist_id
      ),
      updated_at = NOW()
    WHERE artist_id = NEW.artist_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_follows_artists table
DROP TRIGGER IF EXISTS update_artist_stats_on_follow_change ON user_follows_artists;
CREATE TRIGGER update_artist_stats_on_follow_change
  AFTER INSERT OR DELETE ON user_follows_artists
  FOR EACH ROW
  EXECUTE FUNCTION update_artist_follower_count();

-- Initialize artist_stats for all existing artists
INSERT INTO artist_stats (artist_id)
SELECT id FROM artists
ON CONFLICT (artist_id) DO NOTHING;

-- Run initial population of all stats
UPDATE artist_stats
SET 
  total_shows = (
    SELECT COUNT(*) 
    FROM shows 
    WHERE headliner_artist_id = artist_stats.artist_id
       OR id IN (SELECT show_id FROM show_artists WHERE artist_id = artist_stats.artist_id)
  ),
  upcoming_shows = (
    SELECT COUNT(*) 
    FROM shows 
    WHERE (headliner_artist_id = artist_stats.artist_id 
       OR id IN (SELECT show_id FROM show_artists WHERE artist_id = artist_stats.artist_id))
      AND date >= CURRENT_DATE 
      AND status = 'upcoming'
  ),
  total_setlists = (
    SELECT COUNT(DISTINCT sl.id) 
    FROM setlists sl
    JOIN shows s ON s.id = sl.show_id
    WHERE s.headliner_artist_id = artist_stats.artist_id
       OR s.id IN (SELECT show_id FROM show_artists WHERE artist_id = artist_stats.artist_id)
  ),
  total_votes = (
    SELECT COUNT(*)
    FROM votes v
    JOIN setlist_songs ss ON ss.id = v.setlist_song_id
    JOIN setlists sl ON sl.id = ss.setlist_id
    JOIN shows s ON s.id = sl.show_id
    WHERE s.headliner_artist_id = artist_stats.artist_id
       OR s.id IN (SELECT show_id FROM show_artists WHERE artist_id = artist_stats.artist_id)
  ),
  total_followers = (
    SELECT COUNT(*) 
    FROM user_follows_artists 
    WHERE artist_id = artist_stats.artist_id
  ),
  last_show_date = (
    SELECT MAX(date) 
    FROM shows 
    WHERE (headliner_artist_id = artist_stats.artist_id 
       OR id IN (SELECT show_id FROM show_artists WHERE artist_id = artist_stats.artist_id))
      AND date <= CURRENT_DATE
  ),
  next_show_date = (
    SELECT MIN(date) 
    FROM shows 
    WHERE (headliner_artist_id = artist_stats.artist_id 
       OR id IN (SELECT show_id FROM show_artists WHERE artist_id = artist_stats.artist_id))
      AND date >= CURRENT_DATE 
      AND status = 'upcoming'
  ),
  updated_at = NOW();