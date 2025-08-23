-- Add missing sync system tables and functions for production
-- This migration adds critical tables for cron job logging, queue tracking, and system health

-- Create cron job logging table
CREATE TABLE IF NOT EXISTS "cron_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_name" varchar(100) NOT NULL,
  "status" varchar(20) NOT NULL, -- 'success', 'failed', 'running'
  "result" jsonb,
  "execution_time_ms" integer,
  "error_message" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create cron metrics for monitoring
CREATE TABLE IF NOT EXISTS "cron_metrics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_name" varchar(100) NOT NULL,
  "execution_time_ms" integer NOT NULL,
  "memory_usage_mb" integer,
  "cpu_percentage" decimal(5,2),
  "error_count" integer DEFAULT 0,
  "success_count" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create queue job tracking (for BullMQ integration)
CREATE TABLE IF NOT EXISTS "queue_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "queue_name" varchar(100) NOT NULL,
  "job_id" varchar(255) NOT NULL,
  "job_data" jsonb,
  "status" varchar(20) DEFAULT 'pending',
  "attempts" integer DEFAULT 0,
  "max_attempts" integer DEFAULT 3,
  "error_message" text,
  "processed_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add system health monitoring table if not exists
CREATE TABLE IF NOT EXISTS "system_health" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "service_name" varchar(100) NOT NULL,
  "status" "system_health_status" NOT NULL, -- 'healthy', 'degraded', 'down'
  "last_check" timestamp DEFAULT now(),
  "response_time_ms" integer,
  "error_count" integer DEFAULT 0,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create log_cron_run function
CREATE OR REPLACE FUNCTION log_cron_run(
  job_name_param varchar(100),
  status_param varchar(20),
  result_param jsonb DEFAULT NULL,
  execution_time_ms_param integer DEFAULT NULL,
  error_message_param text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO cron_logs (job_name, status, result, execution_time_ms, error_message)
  VALUES (job_name_param, status_param, result_param, execution_time_ms_param, error_message_param)
  RETURNING id INTO log_id;
  
  -- Also update metrics if successful
  IF status_param = 'success' AND execution_time_ms_param IS NOT NULL THEN
    INSERT INTO cron_metrics (job_name, execution_time_ms, success_count)
    VALUES (job_name_param, execution_time_ms_param, 1);
  ELSIF status_param = 'failed' THEN
    INSERT INTO cron_metrics (job_name, execution_time_ms, error_count)
    VALUES (job_name_param, COALESCE(execution_time_ms_param, 0), 1);
  END IF;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Performance optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cron_logs_job_time 
ON cron_logs(job_name, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cron_metrics_job_time 
ON cron_metrics(job_name, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_jobs_status 
ON queue_jobs(queue_name, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_health_service 
ON system_health(service_name, created_at DESC);

-- Add missing indexes for performance optimization (from analysis)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_activity_lookup 
ON artists(last_synced_at, updated_at, popularity DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_trending_score 
ON artists(trending_score DESC, updated_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_recent_activity 
ON votes(created_at DESC) WHERE created_at >= NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_duplicate_detection 
ON songs(spotify_id, name, artist) WHERE spotify_id IS NOT NULL;

-- Add missing indexes for sync_jobs and sync_progress
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_jobs_status 
ON sync_jobs(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_jobs_entity 
ON sync_jobs(entity_type, entity_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_jobs_priority 
ON sync_jobs(priority, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_progress_job 
ON sync_progress(job_id);

-- Materialized view for trending artists
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_artists_mv AS
SELECT 
  a.id,
  a.name,
  a.slug,
  a.image_url,
  a.trending_score,
  COUNT(DISTINCT s.id) as total_shows,
  COUNT(DISTINCT v.id) as total_votes,
  MAX(s.date) as latest_show_date
FROM artists a
LEFT JOIN shows s ON s.headliner_artist_id = a.id
LEFT JOIN votes v ON v.artist_id = a.id AND v.created_at >= NOW() - INTERVAL '7 days'
WHERE a.id IS NOT NULL
GROUP BY a.id, a.name, a.slug, a.image_url, a.trending_score
ORDER BY a.trending_score DESC;

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_trending_data()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY trending_artists_mv;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function for old sync data
CREATE OR REPLACE FUNCTION cleanup_old_sync_data() RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  total_deleted INTEGER := 0;
BEGIN
  -- Delete sync jobs older than 7 days
  DELETE FROM sync_jobs 
  WHERE created_at < NOW() - INTERVAL '7 days'
  AND status IN ('completed', 'failed');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  
  -- Delete old cron logs (keep 30 days)
  DELETE FROM cron_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  
  -- Delete old queue jobs (keep 3 days for completed/failed)
  DELETE FROM queue_jobs
  WHERE created_at < NOW() - INTERVAL '3 days'
  AND status IN ('completed', 'failed');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  
  RETURN total_deleted;
END;
$$ LANGUAGE plpgsql;

-- Add foreign key constraint for sync_progress if not exists
DO $$
BEGIN
  -- Add constraint to sync_progress if sync_jobs exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_sync_progress_job_id'
  ) THEN
    ALTER TABLE sync_progress 
    ADD CONSTRAINT fk_sync_progress_job_id 
    FOREIGN KEY (job_id) REFERENCES sync_jobs(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
