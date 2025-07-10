-- Rate limiting for anonymous suggestions/voting

-- Create a function to check rate limits for anonymous suggestions
CREATE OR REPLACE FUNCTION check_anonymous_suggestion_rate_limit(
  p_session_id TEXT,
  p_time_window INTERVAL DEFAULT '1 hour'::INTERVAL,
  p_max_suggestions INTEGER DEFAULT 10
)
RETURNS BOOLEAN AS $$
DECLARE
  suggestion_count INTEGER;
BEGIN
  -- Count suggestions from this session in the time window
  SELECT COUNT(*)
  INTO suggestion_count
  FROM anonymous_suggestions
  WHERE session_id = p_session_id
    AND created_at > NOW() - p_time_window;
  
  -- Return true if under the limit, false if at or over
  RETURN suggestion_count < p_max_suggestions;
END;
$$ LANGUAGE plpgsql;

-- Create a more sophisticated rate limit check with multiple tiers
CREATE OR REPLACE FUNCTION check_anonymous_rate_limits(
  p_session_id TEXT
)
RETURNS TABLE(
  can_suggest BOOLEAN,
  hourly_count INTEGER,
  daily_count INTEGER,
  hourly_limit INTEGER,
  daily_limit INTEGER,
  minutes_until_reset INTEGER
) AS $$
DECLARE
  v_hourly_count INTEGER;
  v_daily_count INTEGER;
  v_hourly_limit INTEGER := 10;  -- 10 suggestions per hour
  v_daily_limit INTEGER := 50;   -- 50 suggestions per day
  v_can_suggest BOOLEAN;
  v_oldest_hourly TIMESTAMP;
  v_minutes_until_reset INTEGER;
BEGIN
  -- Count hourly suggestions
  SELECT COUNT(*), MIN(created_at)
  INTO v_hourly_count, v_oldest_hourly
  FROM anonymous_suggestions
  WHERE session_id = p_session_id
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Count daily suggestions
  SELECT COUNT(*)
  INTO v_daily_count
  FROM anonymous_suggestions
  WHERE session_id = p_session_id
    AND created_at > NOW() - INTERVAL '24 hours';
  
  -- Check if under both limits
  v_can_suggest := v_hourly_count < v_hourly_limit AND v_daily_count < v_daily_limit;
  
  -- Calculate minutes until hourly reset
  IF v_hourly_count >= v_hourly_limit AND v_oldest_hourly IS NOT NULL THEN
    v_minutes_until_reset := EXTRACT(EPOCH FROM (v_oldest_hourly + INTERVAL '1 hour' - NOW())) / 60;
    v_minutes_until_reset := GREATEST(v_minutes_until_reset, 0);
  ELSE
    v_minutes_until_reset := 0;
  END IF;
  
  RETURN QUERY SELECT 
    v_can_suggest,
    v_hourly_count,
    v_daily_count,
    v_hourly_limit,
    v_daily_limit,
    v_minutes_until_reset::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up old anonymous suggestions (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_anonymous_suggestions(
  p_days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM anonymous_suggestions
  WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create an index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_anonymous_suggestions_session_time 
  ON anonymous_suggestions(session_id, created_at DESC);

-- Create a view for monitoring rate limit usage
CREATE OR REPLACE VIEW anonymous_suggestion_usage AS
SELECT 
  session_id,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as hourly_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as daily_count,
  COUNT(*) as total_count,
  MIN(created_at) as first_suggestion,
  MAX(created_at) as last_suggestion,
  ARRAY_AGG(DISTINCT artist_name ORDER BY artist_name) as suggested_artists
FROM anonymous_suggestions
GROUP BY session_id
HAVING COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') > 0
ORDER BY daily_count DESC;

-- Function to enforce rate limits via trigger (optional - can be enforced in application)
CREATE OR REPLACE FUNCTION enforce_anonymous_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  rate_check RECORD;
BEGIN
  -- Check rate limits
  SELECT * INTO rate_check
  FROM check_anonymous_rate_limits(NEW.session_id);
  
  IF NOT rate_check.can_suggest THEN
    RAISE EXCEPTION 'Rate limit exceeded. You have made % suggestions in the last hour (limit: %) and % in the last day (limit: %). Please try again in % minutes.',
      rate_check.hourly_count,
      rate_check.hourly_limit,
      rate_check.daily_count,
      rate_check.daily_limit,
      rate_check.minutes_until_reset
    USING ERRCODE = 'P0001';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create trigger to enforce rate limits at database level
-- Uncomment if you want database-level enforcement in addition to application-level
-- DROP TRIGGER IF EXISTS enforce_anonymous_rate_limit_trigger ON anonymous_suggestions;
-- CREATE TRIGGER enforce_anonymous_rate_limit_trigger
--   BEFORE INSERT ON anonymous_suggestions
--   FOR EACH ROW
--   EXECUTE FUNCTION enforce_anonymous_rate_limit();

-- Create RLS policies for anonymous_suggestions if not exists
DO $$
BEGIN
  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'anonymous_suggestions' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE anonymous_suggestions ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Anyone can view anonymous suggestions" ON anonymous_suggestions;
  DROP POLICY IF EXISTS "Rate limited insert for anonymous suggestions" ON anonymous_suggestions;
  
  -- Create new policies
  EXECUTE 'CREATE POLICY "Anyone can view anonymous suggestions" ON anonymous_suggestions 
    FOR SELECT USING (true)';
    
  -- Note: INSERT policy would need custom logic to check session_id from request
  -- This is better handled at application level
END $$;

-- Add helpful comments
COMMENT ON FUNCTION check_anonymous_suggestion_rate_limit IS 'Simple rate limit check for anonymous suggestions within a time window';
COMMENT ON FUNCTION check_anonymous_rate_limits IS 'Comprehensive rate limit check with hourly and daily limits';
COMMENT ON FUNCTION cleanup_old_anonymous_suggestions IS 'Maintenance function to remove old anonymous suggestions';
COMMENT ON VIEW anonymous_suggestion_usage IS 'Monitor anonymous suggestion usage patterns and potential abuse';