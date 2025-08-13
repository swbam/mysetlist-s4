-- =====================================================================
-- Add Missing Database Functions for Cron Jobs
-- =====================================================================

-- Drop existing functions if they exist to avoid conflicts
DROP FUNCTION IF EXISTS update_trending_scores() CASCADE;
DROP FUNCTION IF EXISTS refresh_trending_data() CASCADE;
DROP FUNCTION IF EXISTS log_cron_run(text, text) CASCADE;

-- Create function to update trending scores
CREATE OR REPLACE FUNCTION update_trending_scores()
RETURNS void AS $$
BEGIN
  -- Update artist stats trending score
  UPDATE artist_stats
  SET 
    trending_score = GREATEST(0, COALESCE(
      (popularity * 0.3 + 
       COALESCE(monthly_listeners, 0) * 0.00001 + 
       COALESCE(followers, 0) * 0.00001 +
       CASE WHEN has_upcoming_shows THEN 20 ELSE 0 END +
       CASE WHEN last_show_date > CURRENT_DATE - INTERVAL '30 days' THEN 10 ELSE 0 END),
      0
    )),
    trending_score_updated_at = NOW()
  WHERE artist_id IN (
    SELECT id FROM artists WHERE verified = true
  );

  -- Update trending_artists table
  INSERT INTO trending_artists (artist_id, score, period, calculated_at)
  SELECT 
    artist_id,
    trending_score,
    'weekly',
    NOW()
  FROM artist_stats
  WHERE trending_score > 0
  ORDER BY trending_score DESC
  LIMIT 100
  ON CONFLICT (artist_id, period) 
  DO UPDATE SET 
    score = EXCLUDED.score,
    calculated_at = EXCLUDED.calculated_at;

  -- Update shows trending scores
  UPDATE shows
  SET 
    trending_score = GREATEST(0, COALESCE(
      (
        -- Base score from ticket availability
        CASE 
          WHEN ticket_status = 'onsale' THEN 50
          WHEN ticket_status = 'presale' THEN 40
          ELSE 10
        END +
        -- Days until show (closer = higher score)
        CASE 
          WHEN date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 50
          WHEN date BETWEEN CURRENT_DATE + INTERVAL '7 days' AND CURRENT_DATE + INTERVAL '30 days' THEN 30
          WHEN date BETWEEN CURRENT_DATE + INTERVAL '30 days' AND CURRENT_DATE + INTERVAL '90 days' THEN 20
          ELSE 5
        END +
        -- Artist popularity bonus
        COALESCE((
          SELECT trending_score * 0.5
          FROM artist_stats 
          WHERE artist_id = shows.headliner_artist_id
        ), 0)
      ),
      0
    )),
    trending_score_updated_at = NOW()
  WHERE date >= CURRENT_DATE
  AND date <= CURRENT_DATE + INTERVAL '180 days';

  -- Update trending_shows table
  INSERT INTO trending_shows (show_id, score, period, calculated_at)
  SELECT 
    id,
    trending_score,
    'weekly',
    NOW()
  FROM shows
  WHERE trending_score > 0
  AND date >= CURRENT_DATE
  ORDER BY trending_score DESC
  LIMIT 100
  ON CONFLICT (show_id, period) 
  DO UPDATE SET 
    score = EXCLUDED.score,
    calculated_at = EXCLUDED.calculated_at;
END;
$$ LANGUAGE plpgsql;

-- Create function to refresh trending data
CREATE OR REPLACE FUNCTION refresh_trending_data()
RETURNS jsonb AS $$
DECLARE
  artists_updated INTEGER;
  shows_updated INTEGER;
BEGIN
  -- Call update_trending_scores
  PERFORM update_trending_scores();
  
  -- Get counts
  SELECT COUNT(*) INTO artists_updated 
  FROM trending_artists 
  WHERE calculated_at > NOW() - INTERVAL '1 minute';
  
  SELECT COUNT(*) INTO shows_updated 
  FROM trending_shows 
  WHERE calculated_at > NOW() - INTERVAL '1 minute';
  
  -- Clean up old trending data
  DELETE FROM trending_artists WHERE calculated_at < NOW() - INTERVAL '30 days';
  DELETE FROM trending_shows WHERE calculated_at < NOW() - INTERVAL '30 days';
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Trending data refreshed successfully',
    'timestamp', NOW(),
    'artists_updated', artists_updated,
    'shows_updated', shows_updated
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to log cron runs
CREATE OR REPLACE FUNCTION log_cron_run(
  job_name text,
  status text
)
RETURNS void AS $$
BEGIN
  -- Create table if it doesn't exist
  CREATE TABLE IF NOT EXISTS cron_job_logs (
    id SERIAL PRIMARY KEY,
    job_name TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- Insert log entry
  INSERT INTO cron_job_logs (job_name, status, created_at)
  VALUES (job_name, status, NOW());
  
  -- Clean up old logs (keep last 7 days)
  DELETE FROM cron_job_logs WHERE created_at < NOW() - INTERVAL '7 days';
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail if logging fails
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_trending_scores() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION refresh_trending_data() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION log_cron_run(text, text) TO anon, authenticated, service_role;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_artist_stats_trending_score ON artist_stats(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_shows_trending_score ON shows(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_artists_calculated ON trending_artists(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_shows_calculated ON trending_shows(calculated_at DESC);

-- Add comment for documentation
COMMENT ON FUNCTION update_trending_scores() IS 'Updates trending scores for all artists and shows based on popularity metrics';
COMMENT ON FUNCTION refresh_trending_data() IS 'Refreshes all trending data and returns statistics';
COMMENT ON FUNCTION log_cron_run(text, text) IS 'Logs cron job execution for monitoring';