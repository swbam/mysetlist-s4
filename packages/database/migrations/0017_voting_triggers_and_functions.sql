-- Migration: Add voting triggers and real-time functions
-- This migration adds all the database triggers and functions needed for real-time voting

-- Function to update setlist song vote counts
CREATE OR REPLACE FUNCTION update_setlist_song_votes()
RETURNS TRIGGER AS $$
DECLARE
  vote_change INTEGER;
  new_upvotes INTEGER;
  new_downvotes INTEGER;
  new_net_votes INTEGER;
BEGIN
  -- Determine the change in votes
  IF TG_OP = 'INSERT' THEN
    -- New vote
    vote_change := CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE -1 END;
    
    -- Calculate new vote counts
    SELECT 
      COALESCE(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END), 0)
    INTO new_upvotes, new_downvotes
    FROM votes 
    WHERE setlist_song_id = NEW.setlist_song_id;
    
    new_net_votes := new_upvotes - new_downvotes;
    
    -- Update setlist_songs table
    UPDATE setlist_songs 
    SET 
      upvotes = new_upvotes,
      downvotes = new_downvotes,
      net_votes = new_net_votes,
      updated_at = NOW()
    WHERE id = NEW.setlist_song_id;
    
    -- Update vote count on parent setlist
    UPDATE setlists 
    SET 
      total_votes = (
        SELECT COALESCE(SUM(upvotes + downvotes), 0)
        FROM setlist_songs 
        WHERE setlist_id = (SELECT setlist_id FROM setlist_songs WHERE id = NEW.setlist_song_id)
      ),
      updated_at = NOW()
    WHERE id = (SELECT setlist_id FROM setlist_songs WHERE id = NEW.setlist_song_id);
    
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
          WHERE ss.id = NEW.setlist_song_id
        )
      ),
      updated_at = NOW()
    WHERE id = (
      SELECT sl.show_id 
      FROM setlists sl 
      INNER JOIN setlist_songs ss ON sl.id = ss.setlist_id 
      WHERE ss.id = NEW.setlist_song_id
    );
    
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Vote type changed
    IF OLD.vote_type != NEW.vote_type THEN
      -- Recalculate vote counts
      SELECT 
        COALESCE(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END), 0)
      INTO new_upvotes, new_downvotes
      FROM votes 
      WHERE setlist_song_id = NEW.setlist_song_id;
      
      new_net_votes := new_upvotes - new_downvotes;
      
      -- Update setlist_songs table
      UPDATE setlist_songs 
      SET 
        upvotes = new_upvotes,
        downvotes = new_downvotes,
        net_votes = new_net_votes,
        updated_at = NOW()
      WHERE id = NEW.setlist_song_id;
      
      -- Update parent counts (same as INSERT)
      UPDATE setlists 
      SET 
        total_votes = (
          SELECT COALESCE(SUM(upvotes + downvotes), 0)
          FROM setlist_songs 
          WHERE setlist_id = (SELECT setlist_id FROM setlist_songs WHERE id = NEW.setlist_song_id)
        ),
        updated_at = NOW()
      WHERE id = (SELECT setlist_id FROM setlist_songs WHERE id = NEW.setlist_song_id);
      
      UPDATE shows 
      SET 
        vote_count = (
          SELECT COALESCE(SUM(s.total_votes), 0)
          FROM setlists s 
          WHERE s.show_id = (
            SELECT sl.show_id 
            FROM setlists sl 
            INNER JOIN setlist_songs ss ON sl.id = ss.setlist_id 
            WHERE ss.id = NEW.setlist_song_id
          )
        ),
        updated_at = NOW()
      WHERE id = (
        SELECT sl.show_id 
        FROM setlists sl 
        INNER JOIN setlist_songs ss ON sl.id = ss.setlist_id 
        WHERE ss.id = NEW.setlist_song_id
      );
    END IF;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Vote removed
    -- Recalculate vote counts
    SELECT 
      COALESCE(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END), 0)
    INTO new_upvotes, new_downvotes
    FROM votes 
    WHERE setlist_song_id = OLD.setlist_song_id;
    
    new_net_votes := new_upvotes - new_downvotes;
    
    -- Update setlist_songs table
    UPDATE setlist_songs 
    SET 
      upvotes = new_upvotes,
      downvotes = new_downvotes,
      net_votes = new_net_votes,
      updated_at = NOW()
    WHERE id = OLD.setlist_song_id;
    
    -- Update parent counts
    UPDATE setlists 
    SET 
      total_votes = (
        SELECT COALESCE(SUM(upvotes + downvotes), 0)
        FROM setlist_songs 
        WHERE setlist_id = (SELECT setlist_id FROM setlist_songs WHERE id = OLD.setlist_song_id)
      ),
      updated_at = NOW()
    WHERE id = (SELECT setlist_id FROM setlist_songs WHERE id = OLD.setlist_song_id);
    
    UPDATE shows 
    SET 
      vote_count = (
        SELECT COALESCE(SUM(s.total_votes), 0)
        FROM setlists s 
        WHERE s.show_id = (
          SELECT sl.show_id 
          FROM setlists sl 
          INNER JOIN setlist_songs ss ON sl.id = ss.setlist_id 
          WHERE ss.id = OLD.setlist_song_id
        )
      ),
      updated_at = NOW()
    WHERE id = (
      SELECT sl.show_id 
      FROM setlists sl 
      INNER JOIN setlist_songs ss ON sl.id = ss.setlist_id 
      WHERE ss.id = OLD.setlist_song_id
    );
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the vote count trigger
DROP TRIGGER IF EXISTS setlist_song_vote_count_trigger ON votes;
CREATE TRIGGER setlist_song_vote_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_setlist_song_votes();

-- Function to update trending scores
CREATE OR REPLACE FUNCTION update_trending_scores()
RETURNS void AS $$
DECLARE
  decay_factor NUMERIC := 0.8;
  vote_weight NUMERIC := 1.0;
  view_weight NUMERIC := 0.1;
  time_window INTERVAL := '24 hours';
BEGIN
  -- Update show trending scores
  UPDATE shows 
  SET 
    trending_score = GREATEST(0, (
      COALESCE((
        SELECT SUM(
          CASE 
            WHEN v.created_at > NOW() - time_window THEN 
              vote_weight * EXP(-EXTRACT(EPOCH FROM (NOW() - v.created_at)) / 3600)
            ELSE 0 
          END
        )
        FROM votes v
        INNER JOIN setlist_songs ss ON v.setlist_song_id = ss.id
        INNER JOIN setlists sl ON ss.setlist_id = sl.id
        WHERE sl.show_id = shows.id
      ), 0) +
      COALESCE(view_count * view_weight, 0)
    ) * decay_factor),
    updated_at = NOW()
  WHERE 
    date >= CURRENT_DATE - INTERVAL '30 days'
    AND (trending_score > 0 OR vote_count > 0 OR view_count > 0);

  -- Update artist trending scores
  UPDATE artists 
  SET 
    trending_score = GREATEST(0, (
      COALESCE((
        SELECT AVG(s.trending_score)
        FROM shows s
        WHERE s.headliner_artist_id = artists.id
          AND s.date >= CURRENT_DATE - INTERVAL '30 days'
          AND s.trending_score > 0
      ), 0) +
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

  RAISE NOTICE 'Updated trending scores at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update artist follower counts
CREATE OR REPLACE FUNCTION update_artist_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE artists 
    SET 
      follower_count = follower_count + 1,
      updated_at = NOW()
    WHERE id = NEW.artist_id;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE artists 
    SET 
      follower_count = GREATEST(0, follower_count - 1),
      updated_at = NOW()
    WHERE id = OLD.artist_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create follower count trigger
DROP TRIGGER IF EXISTS artist_follower_count_trigger ON user_follows_artists;
CREATE TRIGGER artist_follower_count_trigger
  AFTER INSERT OR DELETE ON user_follows_artists
  FOR EACH ROW EXECUTE FUNCTION update_artist_follower_count();

-- Function to update show attendee counts
CREATE OR REPLACE FUNCTION update_show_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shows 
    SET 
      attendee_count = attendee_count + 1,
      updated_at = NOW()
    WHERE id = NEW.show_id;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shows 
    SET 
      attendee_count = GREATEST(0, attendee_count - 1),
      updated_at = NOW()
    WHERE id = OLD.show_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create attendee count trigger
DROP TRIGGER IF EXISTS show_attendee_count_trigger ON user_show_attendance;
CREATE TRIGGER show_attendee_count_trigger
  AFTER INSERT OR DELETE ON user_show_attendance
  FOR EACH ROW EXECUTE FUNCTION update_show_attendee_count();

-- Function to update show setlist counts
CREATE OR REPLACE FUNCTION update_show_setlist_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shows 
    SET 
      setlist_count = setlist_count + 1,
      updated_at = NOW()
    WHERE id = NEW.show_id;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shows 
    SET 
      setlist_count = GREATEST(0, setlist_count - 1),
      updated_at = NOW()
    WHERE id = OLD.show_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create setlist count trigger
DROP TRIGGER IF EXISTS show_setlist_count_trigger ON setlists;
CREATE TRIGGER show_setlist_count_trigger
  AFTER INSERT OR DELETE ON setlists
  FOR EACH ROW EXECUTE FUNCTION update_show_setlist_count();

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
DROP TRIGGER IF EXISTS update_artists_updated_at ON artists;
CREATE TRIGGER update_artists_updated_at 
  BEFORE UPDATE ON artists 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shows_updated_at ON shows;
CREATE TRIGGER update_shows_updated_at 
  BEFORE UPDATE ON shows 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_setlists_updated_at ON setlists;
CREATE TRIGGER update_setlists_updated_at 
  BEFORE UPDATE ON setlists 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_setlist_songs_updated_at ON setlist_songs;
CREATE TRIGGER update_setlist_songs_updated_at 
  BEFORE UPDATE ON setlist_songs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_venues_updated_at ON venues;
CREATE TRIGGER update_venues_updated_at 
  BEFORE UPDATE ON venues 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_songs_updated_at ON songs;
CREATE TRIGGER update_songs_updated_at 
  BEFORE UPDATE ON songs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Performance indexes for vote-related queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_setlist_song_user 
  ON votes (setlist_song_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_created_at 
  ON votes (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_songs_votes 
  ON setlist_songs (net_votes DESC, upvotes DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_trending 
  ON shows (trending_score DESC, date DESC) 
  WHERE trending_score > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_trending 
  ON artists (trending_score DESC, popularity DESC) 
  WHERE trending_score > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_follows_artists_created 
  ON user_follows_artists (artist_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_show_attendance_created 
  ON user_show_attendance (show_id, created_at DESC);

-- Function to get real-time vote statistics
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
    COALESCE(SUM(ss.upvotes + ss.downvotes), 0) AS total_votes,
    COUNT(DISTINCT sl.id) AS total_setlists,
    (
      SELECT so.title 
      FROM setlist_songs ss2
      INNER JOIN songs so ON ss2.song_id = so.id
      WHERE ss2.setlist_id IN (
        SELECT sl2.id FROM setlists sl2 WHERE sl2.show_id = s.id
      )
      ORDER BY ss2.net_votes DESC
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

-- Function to get trending shows with vote metrics
CREATE OR REPLACE FUNCTION get_trending_shows(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  show_id UUID,
  show_name TEXT,
  artist_name TEXT,
  venue_name TEXT,
  show_date DATE,
  trending_score DOUBLE PRECISION,
  total_votes BIGINT,
  vote_velocity NUMERIC,
  attendee_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS show_id,
    s.name AS show_name,
    a.name AS artist_name,
    v.name AS venue_name,
    s.date AS show_date,
    s.trending_score,
    s.vote_count::BIGINT AS total_votes,
    COALESCE((
      SELECT COUNT(*)::NUMERIC / GREATEST(EXTRACT(EPOCH FROM (NOW() - MIN(vt.created_at))) / 3600, 1)
      FROM votes vt
      INNER JOIN setlist_songs ss ON vt.setlist_song_id = ss.id
      INNER JOIN setlists sl ON ss.setlist_id = sl.id
      WHERE sl.show_id = s.id
        AND vt.created_at > NOW() - INTERVAL '24 hours'
    ), 0) AS vote_velocity,
    s.attendee_count
  FROM shows s
  LEFT JOIN artists a ON s.headliner_artist_id = a.id
  LEFT JOIN venues v ON s.venue_id = v.id
  WHERE s.trending_score > 0
    AND s.date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY s.trending_score DESC, s.vote_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;