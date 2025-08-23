-- Critical Infrastructure Tables Migration
-- File: supabase/migrations/20250124_add_critical_infrastructure_tables.sql
-- Provides database foundation for existing services: traffic-aware-scheduler, queue-manager, circuit-breaker, and batch-api-optimizer

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ====================================================================================================
-- SECTION 1: CRON & JOB MONITORING TABLES
-- ====================================================================================================

-- Cron job logging table (referenced throughout codebase but missing)
CREATE TABLE IF NOT EXISTS public.cron_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'running'
  result JSONB,
  execution_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for traffic pattern analysis queries
CREATE INDEX IF NOT EXISTS idx_cron_logs_traffic_analysis 
ON public.cron_logs(job_name, created_at DESC, status);

-- Index for time-based queries (used by traffic-aware-scheduler)
CREATE INDEX IF NOT EXISTS idx_cron_logs_hourly_metrics 
ON public.cron_logs(
  EXTRACT(HOUR FROM created_at),
  EXTRACT(DOW FROM created_at),
  created_at DESC
);

-- Cron metrics for monitoring (referenced by traffic-aware-scheduler.ts)
CREATE TABLE IF NOT EXISTS public.cron_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  memory_usage_mb INTEGER,
  cpu_percentage DECIMAL(5,2),
  error_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for system metrics queries
CREATE INDEX IF NOT EXISTS idx_cron_metrics_analysis 
ON public.cron_metrics(
  EXTRACT(HOUR FROM created_at),
  EXTRACT(DOW FROM created_at),
  job_name,
  created_at DESC
);

-- ====================================================================================================
-- SECTION 2: QUEUE MANAGEMENT TABLES
-- ====================================================================================================

-- Queue job tracking (missing for BullMQ integration - referenced by queue-manager.ts)
CREATE TABLE IF NOT EXISTS public.queue_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name VARCHAR(100) NOT NULL,
  job_id VARCHAR(255) NOT NULL UNIQUE,
  job_data JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for queue monitoring queries
CREATE INDEX IF NOT EXISTS idx_queue_jobs_monitoring 
ON public.queue_jobs(queue_name, status, created_at DESC);

-- Index for job lookup by job_id
CREATE INDEX IF NOT EXISTS idx_queue_jobs_job_id 
ON public.queue_jobs(job_id);

-- ====================================================================================================
-- SECTION 3: SYSTEM HEALTH MONITORING
-- ====================================================================================================

-- System health monitoring (referenced by circuit-breaker and health checks)
CREATE TABLE IF NOT EXISTS public.system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'down'
  last_check TIMESTAMP DEFAULT NOW(),
  response_time_ms INTEGER,
  error_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for health monitoring queries
CREATE INDEX IF NOT EXISTS idx_system_health_monitoring 
ON public.system_health(service_name, status, last_check DESC);

-- ====================================================================================================
-- SECTION 4: PERFORMANCE OPTIMIZATION INDEXES
-- ====================================================================================================

-- Performance optimization indexes (referenced in comprehensive guide)
CREATE INDEX IF NOT EXISTS idx_artists_activity_lookup 
ON public.artists(last_synced_at, updated_at, popularity DESC);

CREATE INDEX IF NOT EXISTS idx_artists_trending_score 
ON public.artists(trending_score DESC, updated_at);

CREATE INDEX IF NOT EXISTS idx_shows_artist_date 
ON public.shows(headliner_artist_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_votes_recent_activity 
ON public.votes(created_at DESC) WHERE created_at >= NOW() - INTERVAL '30 days';

CREATE INDEX IF NOT EXISTS idx_songs_duplicate_detection 
ON public.songs(spotify_id, name, artist) WHERE spotify_id IS NOT NULL;

-- ====================================================================================================
-- SECTION 5: MATERIALIZED VIEWS FOR PERFORMANCE
-- ====================================================================================================

-- Materialized views for performance (referenced by trending calculations)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.trending_artists_mv AS
SELECT 
  a.id,
  a.name,
  a.slug,
  a.image_url,
  a.trending_score,
  COUNT(DISTINCT s.id) as total_shows,
  COUNT(DISTINCT v.id) as total_votes,
  MAX(s.date) as latest_show_date
FROM public.artists a
LEFT JOIN public.shows s ON s.headliner_artist_id = a.id
LEFT JOIN public.votes v ON v.artist_id = a.id AND v.created_at >= NOW() - INTERVAL '7 days'
GROUP BY a.id, a.name, a.slug, a.image_url, a.trending_score
ORDER BY a.trending_score DESC;

-- Index on materialized view for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_artists_mv_id ON public.trending_artists_mv(id);
CREATE INDEX IF NOT EXISTS idx_trending_artists_mv_trending ON public.trending_artists_mv(trending_score DESC);

-- ====================================================================================================
-- SECTION 6: DATABASE FUNCTIONS
-- ====================================================================================================

-- Cron logging function (referenced throughout existing cron jobs)
CREATE OR REPLACE FUNCTION public.log_cron_run(
  job_name_param VARCHAR(100),
  status_param VARCHAR(20),
  result_param JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.cron_logs (job_name, status, result)
  VALUES (job_name_param, status_param, result_param)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Refresh function for materialized view (used by cron jobs)
CREATE OR REPLACE FUNCTION public.refresh_trending_data()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.trending_artists_mv;
END;
$$ LANGUAGE plpgsql;

-- Function to update cron metrics (used by monitoring systems)
CREATE OR REPLACE FUNCTION public.update_cron_metrics(
  job_name_param VARCHAR(100),
  execution_time_param INTEGER,
  memory_usage_param INTEGER DEFAULT NULL,
  cpu_percentage_param DECIMAL DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.cron_metrics (
    job_name, 
    execution_time_ms, 
    memory_usage_mb, 
    cpu_percentage
  ) VALUES (
    job_name_param, 
    execution_time_param, 
    memory_usage_param, 
    cpu_percentage_param
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get traffic patterns (used by traffic-aware-scheduler)
CREATE OR REPLACE FUNCTION public.get_traffic_patterns(days_param INTEGER DEFAULT 30)
RETURNS TABLE(
  hour INTEGER,
  day_of_week INTEGER,
  job_count BIGINT,
  avg_execution_time NUMERIC,
  error_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM cl.created_at)::INTEGER as hour,
    EXTRACT(DOW FROM cl.created_at)::INTEGER as day_of_week,
    COUNT(*) as job_count,
    AVG(cl.execution_time_ms) as avg_execution_time,
    (SUM(CASE WHEN cl.status = 'failed' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)) as error_rate
  FROM public.cron_logs cl
  WHERE cl.created_at >= NOW() - INTERVAL '1 day' * days_param
  GROUP BY 
    EXTRACT(HOUR FROM cl.created_at),
    EXTRACT(DOW FROM cl.created_at)
  ORDER BY day_of_week, hour;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================================================
-- SECTION 7: ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================================================

-- Enable RLS on critical tables
ALTER TABLE public.cron_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

-- Policy for service role access (full access for cron jobs and system processes)
CREATE POLICY "Service role full access on cron_logs" ON public.cron_logs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on cron_metrics" ON public.cron_metrics
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on queue_jobs" ON public.queue_jobs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on system_health" ON public.system_health
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Policy for authenticated users (read-only access to monitoring data)
CREATE POLICY "Authenticated users can read cron_logs" ON public.cron_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read cron_metrics" ON public.cron_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read queue_jobs" ON public.queue_jobs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read system_health" ON public.system_health
  FOR SELECT USING (auth.role() = 'authenticated');

-- ====================================================================================================
-- SECTION 8: TRIGGERS FOR AUTOMATIC MAINTENANCE
-- ====================================================================================================

-- Trigger to update updated_at timestamp on cron_logs
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cron_logs_updated_at
  BEFORE UPDATE ON public.cron_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================================================================
-- SECTION 9: INITIAL DATA & SETUP
-- ====================================================================================================

-- Insert initial system health record
INSERT INTO public.system_health (service_name, status, metadata)
VALUES 
  ('queue-manager', 'healthy', '{"initialized": true}'),
  ('traffic-scheduler', 'healthy', '{"patterns_analyzed": false}'),
  ('circuit-breaker', 'healthy', '{"services_monitored": 0}')
ON CONFLICT DO NOTHING;

-- ====================================================================================================
-- MIGRATION COMPLETION LOG
-- ====================================================================================================

-- Log this migration completion
SELECT public.log_cron_run(
  'infrastructure-migration', 
  'success',
  '{"migration": "20250124_add_critical_infrastructure_tables", "tables_created": 4, "indexes_created": 12, "functions_created": 4}'::jsonb
);

-- Migration completed successfully
-- This migration provides the complete database foundation needed for:
-- 1. traffic-aware-scheduler.ts - traffic pattern analysis and cron optimization
-- 2. queue-manager.ts - BullMQ job tracking and monitoring
-- 3. circuit-breaker.ts - service health monitoring
-- 4. batch-api-optimizer.ts - performance metrics and optimization
-- 5. All existing cron jobs - standardized logging and metrics
