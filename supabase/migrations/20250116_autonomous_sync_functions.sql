-- Create autonomous sync logging function
CREATE OR REPLACE FUNCTION log_autonomous_sync(
  pipeline_name TEXT,
  status TEXT,
  processing_time BIGINT DEFAULT NULL,
  metadata JSONB DEFAULT NULL,
  error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO cron_logs (
    job_name,
    status,
    details,
    started_at,
    completed_at,
    processing_time_ms
  ) VALUES (
    'autonomous-' || pipeline_name || '-engine',
    status,
    COALESCE(
      jsonb_build_object(
        'pipeline', pipeline_name,
        'metadata', metadata,
        'error_message', error_message
      ),
      '{}'::jsonb
    ),
    NOW() - (COALESCE(processing_time, 0) || ' milliseconds')::INTERVAL,
    NOW(),
    processing_time
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION log_autonomous_sync TO service_role;

-- Create autonomous sync health monitoring function
CREATE OR REPLACE FUNCTION get_autonomous_sync_status()
RETURNS TABLE(
  pipeline TEXT,
  last_run TIMESTAMP WITH TIME ZONE,
  status TEXT,
  processing_time_ms BIGINT,
  runs_today INTEGER,
  success_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN cl.job_name LIKE '%trending%' THEN 'trending'
      WHEN cl.job_name LIKE '%sync%' THEN 'sync'
      WHEN cl.job_name LIKE '%maintenance%' THEN 'maintenance'
      ELSE 'unknown'
    END as pipeline,
    MAX(cl.completed_at) as last_run,
    (
      SELECT cl2.status 
      FROM cron_logs cl2 
      WHERE cl2.job_name = cl.job_name 
      ORDER BY cl2.completed_at DESC 
      LIMIT 1
    ) as status,
    (
      SELECT cl2.processing_time_ms 
      FROM cron_logs cl2 
      WHERE cl2.job_name = cl.job_name 
      ORDER BY cl2.completed_at DESC 
      LIMIT 1
    ) as processing_time_ms,
    COUNT(*)::INTEGER as runs_today,
    ROUND(
      (COUNT(*) FILTER (WHERE cl.status = 'success')::DECIMAL / COUNT(*)) * 100,
      2
    ) as success_rate
  FROM cron_logs cl
  WHERE cl.job_name LIKE 'autonomous-%'
    AND cl.started_at >= CURRENT_DATE
  GROUP BY 
    CASE 
      WHEN cl.job_name LIKE '%trending%' THEN 'trending'
      WHEN cl.job_name LIKE '%sync%' THEN 'sync' 
      WHEN cl.job_name LIKE '%maintenance%' THEN 'maintenance'
      ELSE 'unknown'
    END,
    cl.job_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION get_autonomous_sync_status TO service_role;

-- Update the autonomous_sync_health view to use actual data
DROP VIEW IF EXISTS autonomous_sync_health;
CREATE VIEW autonomous_sync_health AS
SELECT 
  pipeline,
  last_run,
  status,
  processing_time_ms,
  runs_today,
  success_rate,
  CASE 
    WHEN last_run < NOW() - INTERVAL '2 hours' AND pipeline = 'trending' THEN 'stale'
    WHEN last_run < NOW() - INTERVAL '8 hours' AND pipeline = 'sync' THEN 'stale'
    WHEN last_run < NOW() - INTERVAL '36 hours' AND pipeline = 'maintenance' THEN 'stale'
    WHEN status = 'failed' THEN 'unhealthy'
    WHEN success_rate < 80 THEN 'degraded'
    ELSE 'healthy'
  END as health_status
FROM get_autonomous_sync_status();

-- Grant access to the view
GRANT SELECT ON autonomous_sync_health TO service_role;