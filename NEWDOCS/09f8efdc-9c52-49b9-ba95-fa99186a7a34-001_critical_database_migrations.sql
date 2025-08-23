-- MySetlist-S4 Critical Missing Database Components
-- File: 001_critical_database_migrations.sql
-- Apply after existing migrations to fix critical missing components

-- =====================================================
-- CRITICAL MISSING TABLES (Referenced but not existing)
-- =====================================================

-- Cron job logging table (referenced everywhere but missing)
CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  result JSONB,
  execution_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cron metrics for monitoring
CREATE TABLE IF NOT EXISTS cron_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  memory_usage_mb INTEGER,
  cpu_percentage DECIMAL(5,2),
  error_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Queue job tracking (missing for BullMQ integration)
CREATE TABLE IF NOT EXISTS queue_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name VARCHAR(100) NOT NULL,
  job_id VARCHAR(255) NOT NULL UNIQUE,
  job_data JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'failed', 'delayed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- System health monitoring
CREATE TABLE IF NOT EXISTS system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  last_check TIMESTAMP DEFAULT NOW(),
  response_time_ms INTEGER,
  error_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- CRITICAL MISSING FUNCTIONS (Called in cron routes)
-- =====================================================

-- log_cron_run function (called everywhere but missing)
CREATE OR REPLACE FUNCTION log_cron_run(
  job_name_param VARCHAR(100),
  status_param VARCHAR(20),
  result_param JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
  execution_time INTEGER;
BEGIN
  -- Calculate execution time if this is a completion
  IF status_param = 'success' OR status_param = 'failed' THEN
    SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::INTEGER * 1000 
    INTO execution_time
    FROM cron_logs 
    WHERE job_name = job_name_param AND status = 'running' 
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  INSERT INTO cron_logs (job_name, status, result, execution_time_ms)
  VALUES (job_name_param, status_param, result_param, execution_time)
  RETURNING id INTO log_id;
  
  -- Update metrics
  IF status_param = 'success' THEN
    INSERT INTO cron_metrics (job_name, execution_time_ms, success_count)
    VALUES (job_name_param, COALESCE(execution_time, 0), 1)
    ON CONFLICT (job_name) DO UPDATE SET
      success_count = cron_metrics.success_count + 1,
      execution_time_ms = EXCLUDED.execution_time_ms,
      created_at = NOW();
  ELSIF status_param = 'failed' THEN
    INSERT INTO cron_metrics (job_name, execution_time_ms, error_count)
    VALUES (job_name_param, COALESCE(execution_time, 0), 1)
    ON CONFLICT (job_name) DO UPDATE SET
      error_count = cron_metrics.error_count + 1,
      created_at = NOW();
  END IF;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE OPTIMIZATION INDEXES (From docs)
-- =====================================================

-- Performance optimization indexes (referenced in docs but missing)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_activity_lookup 
ON artists(last_synced_at, updated_at, popularity DESC)
WHERE last_synced_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_trending_score 
ON artists(trending_score DESC, updated_at)
WHERE trending_score > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_artist_date 
ON shows(headliner_artist_id, date DESC)
WHERE headliner_artist_id IS NOT NULL AND date IS NOT NULL;

-- Add missing index for import status lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_import_status_artist_id 
ON import_status(artist_id, stage, updated_at DESC);

-- Add missing index for import logs performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_import_logs_artist_job 
ON import_logs(artist_id, job_id, created_at DESC);

-- Queue jobs performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_jobs_status_queue 
ON queue_jobs(status, queue_name, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_jobs_job_id 
ON queue_jobs(job_id);

-- Cron logs performance indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cron_logs_job_status_time
ON cron_logs(job_name, status, created_at DESC);

-- =====================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE (From docs)
-- =====================================================

-- Materialized view for trending artists (referenced in docs)
DROP MATERIALIZED VIEW IF EXISTS trending_artists_mv;
CREATE MATERIALIZED VIEW trending_artists_mv AS
SELECT 
  a.id,
  a.name,
  a.slug,
  a.image_url,
  a.trending_score,
  a.popularity,
  COUNT(DISTINCT s.id) as total_shows,
  COUNT(DISTINCT uf.user_id) as follower_count,
  MAX(s.date) as latest_show_date,
  COUNT(DISTINCT s.id) FILTER (WHERE s.date >= NOW()) as upcoming_shows
FROM artists a
LEFT JOIN shows s ON s.headliner_artist_id = a.id
LEFT JOIN user_follows_artists uf ON uf.artist_id = a.id
GROUP BY a.id, a.name, a.slug, a.image_url, a.trending_score, a.popularity
ORDER BY a.trending_score DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS trending_artists_mv_id_idx 
ON trending_artists_mv(id);

-- Function to refresh trending data (called in cron jobs)
CREATE OR REPLACE FUNCTION refresh_trending_data()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY trending_artists_mv;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATA CLEANUP FUNCTIONS (Referenced in cron jobs)
-- =====================================================

-- Cleanup old data function (referenced in complete-catalog-sync)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS TABLE(
  old_logs_removed INTEGER,
  old_metrics_removed INTEGER,
  old_queue_jobs_removed INTEGER
) AS $$
DECLARE
  logs_count INTEGER;
  metrics_count INTEGER;  
  jobs_count INTEGER;
BEGIN
  -- Remove cron logs older than 30 days
  DELETE FROM cron_logs WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS logs_count = ROW_COUNT;
  
  -- Remove cron metrics older than 90 days  
  DELETE FROM cron_metrics WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS metrics_count = ROW_COUNT;
  
  -- Remove completed queue jobs older than 7 days
  DELETE FROM queue_jobs 
  WHERE status IN ('completed', 'failed') 
  AND completed_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS jobs_count = ROW_COUNT;
  
  RETURN QUERY SELECT logs_count, metrics_count, jobs_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions for the application
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;