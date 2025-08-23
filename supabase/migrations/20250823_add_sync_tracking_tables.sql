-- Sync & Import Tracking Tables Migration
-- Generated 2025-08-23 by Cursor AI

-- 1. sync_jobs table
CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  spotify_id TEXT,
  tm_attraction_id TEXT,
  setlistfm_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER DEFAULT 0,
  completed_steps INTEGER DEFAULT 0,
  current_step TEXT,
  job_type TEXT NOT NULL,
  metadata JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  auto_retry BOOLEAN DEFAULT TRUE,
  max_retries INTEGER DEFAULT 3,
  retry_count INTEGER DEFAULT 0
);

-- Indexes to optimize common lookups
CREATE INDEX IF NOT EXISTS idx_sync_jobs_entity ON public.sync_jobs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON public.sync_jobs (status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created_at ON public.sync_jobs (created_at DESC);

-- 2. sync_progress table
CREATE TABLE IF NOT EXISTS public.sync_progress (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES public.sync_jobs(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  status TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  message TEXT,
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  successful_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_progress_job ON public.sync_progress (job_id);
CREATE INDEX IF NOT EXISTS idx_sync_progress_step ON public.sync_progress (step);