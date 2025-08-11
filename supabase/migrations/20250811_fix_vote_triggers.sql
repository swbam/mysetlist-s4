-- Fix vote count aggregation triggers to match current schema
-- The current schema only supports upvotes (no downvotes) for positive UX
-- This migration fixes the vote triggers to work with the simplified voting system

-- Drop the old trigger and function that reference non-existent fields
DROP TRIGGER IF EXISTS setlist_song_vote_count_trigger ON votes;
DROP FUNCTION IF EXISTS update_setlist_song_votes();

-- Create corrected function for upvote-only system
CREATE OR REPLACE FUNCTION update_setlist_song_upvotes()
RETURNS TRIGGER AS $$
DECLARE
  new_upvotes INTEGER;
BEGIN
  -- Calculate upvote count for the setlist song
  SELECT COUNT(*) INTO new_upvotes
  FROM votes 
  WHERE setlist_song_id = COALESCE(NEW.setlist_song_id, OLD.setlist_song_id);
  
  -- Update setlist_songs table with new upvote count
  UPDATE setlist_songs 
  SET 
    upvotes = new_upvotes,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.setlist_song_id, OLD.setlist_song_id);
  
  -- Update total votes on parent setlist
  UPDATE setlists 
  SET 
    total_votes = (
      SELECT COALESCE(SUM(upvotes), 0)
      FROM setlist_songs 
      WHERE setlist_id = (
        SELECT setlist_id 
        FROM setlist_songs 
        WHERE id = COALESCE(NEW.setlist_song_id, OLD.setlist_song_id)
      )
    ),
    updated_at = NOW()
  WHERE id = (
    SELECT setlist_id 
    FROM setlist_songs 
    WHERE id = COALESCE(NEW.setlist_song_id, OLD.setlist_song_id)
  );
  
  -- Update vote count on parent show
  UPDATE shows 
  SET 
    vote_count = (
      SELECT COALESCE(SUM(s.total_votes), 0)
      FROM setlists s 
      WHERE s.show_id = (
        SELECT sl.show_id 
        FROM setlists sl 
        INNER JOIN setlist_songs ss ON sl.id = ss.setlist_id 
        WHERE ss.id = COALESCE(NEW.setlist_song_id, OLD.setlist_song_id)
      )
    ),
    updated_at = NOW()
  WHERE id = (
    SELECT sl.show_id 
    FROM setlists sl 
    INNER JOIN setlist_songs ss ON sl.id = ss.setlist_id 
    WHERE ss.id = COALESCE(NEW.setlist_song_id, OLD.setlist_song_id)
  );
  
  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create the corrected trigger
CREATE TRIGGER setlist_song_upvote_count_trigger
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_setlist_song_upvotes();

-- Fix the trending scores function to work with upvote-only system
CREATE OR REPLACE FUNCTION update_trending_scores()
RETURNS void AS $$
DECLARE
  decay_factor NUMERIC := 0.8; -- How quickly scores decay over time
  vote_weight NUMERIC := 1.0;  -- Weight for recent votes
  view_weight NUMERIC := 0.1;  -- Weight for views
  time_window INTERVAL := '24 hours'; -- Consider votes in last 24 hours
BEGIN
  -- Update show trending scores
  UPDATE shows 
  SET 
    trending_score = GREATEST(0, (
      -- Recent vote activity (weighted by time) - upvotes only
      COALESCE((
        SELECT SUM(
          vote_weight * EXP(-EXTRACT(EPOCH FROM (NOW() - v.created_at)) / 3600)
        )
        FROM votes v
        INNER JOIN setlist_songs ss ON v.setlist_song_id = ss.id
        INNER JOIN setlists sl ON ss.setlist_id = sl.id
        WHERE sl.show_id = shows.id
          AND v.created_at > NOW() - time_window
      ), 0) +
      -- View count factor
      COALESCE(view_count * view_weight, 0)
    ) * decay_factor),
    updated_at = NOW()
  WHERE 
    date >= CURRENT_DATE - INTERVAL '30 days' -- Only update recent shows
    AND (trending_score > 0 OR vote_count > 0 OR view_count > 0);

  -- Update artist trending scores
  UPDATE artists 
  SET 
    trending_score = GREATEST(0, (
      -- Recent show activity
      COALESCE((
        SELECT AVG(s.trending_score)
        FROM shows s
        WHERE s.headliner_artist_id = artists.id
          AND s.date >= CURRENT_DATE - INTERVAL '30 days'
          AND s.trending_score > 0
      ), 0) +
      -- Follower activity (new follows in last 24 hours)
      COALESCE((
        SELECT COUNT(*) * 0.5
        FROM user_follows_artists ufa
        WHERE ufa.artist_id = artists.id
          AND ufa.created_at > NOW() - time_window
      ), 0)
    ) * decay_factor),
    updated_at = NOW()
  WHERE 
    (trending_score > 0 OR follower_count > 0)
    AND last_synced_at > NOW() - INTERVAL '7 days';

  -- Log the update
  RAISE NOTICE 'Updated trending scores at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Fix the vote statistics function to work with upvote-only system
CREATE OR REPLACE FUNCTION get_vote_stats(input_show_id UUID DEFAULT NULL)
RETURNS TABLE (
  show_id UUID,
  show_name TEXT,
  total_votes BIGINT,
  total_setlists BIGINT,
  most_voted_song TEXT,
  vote_velocity NUMERIC,
  last_vote_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS show_id,
    s.name AS show_name,
    COALESCE(SUM(ss.upvotes), 0) AS total_votes,
    COUNT(DISTINCT sl.id) AS total_setlists,
    (
      SELECT so.title 
      FROM setlist_songs ss2
      INNER JOIN songs so ON ss2.song_id = so.id
      WHERE ss2.setlist_id IN (
        SELECT sl2.id FROM setlists sl2 WHERE sl2.show_id = s.id
      )
      ORDER BY ss2.upvotes DESC
      LIMIT 1
    ) AS most_voted_song,
    COALESCE((
      SELECT COUNT(*)::NUMERIC / GREATEST(EXTRACT(EPOCH FROM (NOW() - MIN(v.created_at))) / 3600, 1)
      FROM votes v
      INNER JOIN setlist_songs ss3 ON v.setlist_song_id = ss3.id
      INNER JOIN setlists sl3 ON ss3.setlist_id = sl3.id
      WHERE sl3.show_id = s.id
        AND v.created_at > NOW() - INTERVAL '24 hours'
    ), 0) AS vote_velocity,
    (
      SELECT MAX(v.created_at)
      FROM votes v
      INNER JOIN setlist_songs ss4 ON v.setlist_song_id = ss4.id
      INNER JOIN setlists sl4 ON ss4.setlist_id = sl4.id
      WHERE sl4.show_id = s.id
    ) AS last_vote_time
  FROM shows s
  LEFT JOIN setlists sl ON s.id = sl.show_id
  LEFT JOIN setlist_songs ss ON sl.id = ss.setlist_id
  WHERE (input_show_id IS NULL OR s.id = input_show_id)
    AND s.date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY s.id, s.name
  ORDER BY total_votes DESC;
END;
$$ LANGUAGE plpgsql;

-- Create missing tables referenced by triggers if they don't exist
CREATE TABLE IF NOT EXISTS user_follows_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, artist_id)
);

CREATE TABLE IF NOT EXISTS user_show_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, show_id)
);

CREATE TABLE IF NOT EXISTS cron_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_votes_setlist_song_created 
  ON votes(setlist_song_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_setlist_songs_upvotes 
  ON setlist_songs(upvotes DESC);

CREATE INDEX IF NOT EXISTS idx_user_follows_artists_created 
  ON user_follows_artists(artist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_show_attendance_created 
  ON user_show_attendance(show_id, created_at DESC);

-- Log the fix
INSERT INTO cron_job_logs (job_name, status, message, created_at)
VALUES ('vote-triggers-fix', 'completed', 'Fixed vote triggers to match upvote-only schema', NOW());