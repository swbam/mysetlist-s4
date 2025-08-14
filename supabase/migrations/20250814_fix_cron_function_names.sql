-- =====================================================================
-- Fix Database Function Names for Cron Jobs
-- Ensure function names match what cron jobs are calling
-- =====================================================================

-- Fix the trending functions to match what cron jobs expect
CREATE OR REPLACE FUNCTION update_trending_scores()
RETURNS void AS $$
BEGIN
  -- Call the existing specialized functions
  PERFORM update_artist_trending_scores();
  PERFORM update_show_trending_scores();
END;
$$ LANGUAGE plpgsql;

-- Create log_cron_run function with details parameter support
CREATE OR REPLACE FUNCTION log_cron_run(
  job_name text,
  status text,
  details text DEFAULT NULL
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
  
  -- Insert log entry with proper JSON parsing
  INSERT INTO cron_job_logs (job_name, status, message, details, created_at)
  VALUES (
    job_name, 
    status, 
    CASE 
      WHEN details IS NOT NULL THEN 'Execution completed'
      ELSE 'Execution logged'
    END,
    CASE 
      WHEN details IS NOT NULL THEN details::jsonb
      ELSE NULL
    END,
    NOW()
  );
  
  -- Clean up old logs (keep last 30 days)
  DELETE FROM cron_job_logs WHERE created_at < NOW() - INTERVAL '30 days';
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail if logging fails to not break cron jobs
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_trending_scores() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION log_cron_run(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION log_cron_run(text, text) TO anon, authenticated, service_role;

-- Ensure the table has proper indexes
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_created_at ON cron_job_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name ON cron_job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_status ON cron_job_logs(status);

-- Comments
COMMENT ON FUNCTION update_trending_scores() IS 'Wrapper function that calls both artist and show trending score updates';
COMMENT ON FUNCTION log_cron_run(text, text, text) IS 'Enhanced cron job logging with optional JSON details';