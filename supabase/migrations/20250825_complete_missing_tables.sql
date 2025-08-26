-- Complete Missing Tables Migration
-- This migration adds all tables referenced in the codebase but missing from the database

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ====================================================================================================
-- IMPORT STATUS TRACKING (Referenced in import-status.ts)
-- ====================================================================================================

CREATE TABLE IF NOT EXISTS public.import_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  message TEXT,
  error TEXT,
  job_id TEXT,
  artist_name TEXT,
  total_songs INTEGER,
  total_shows INTEGER,
  total_venues INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for import status lookups
CREATE INDEX IF NOT EXISTS idx_import_status_artist_id ON public.import_status(artist_id);
CREATE INDEX IF NOT EXISTS idx_import_status_job_id ON public.import_status(job_id);
CREATE INDEX IF NOT EXISTS idx_import_status_stage ON public.import_status(stage);

-- ====================================================================================================
-- QUEUE SYSTEM TABLES (Referenced in queue-manager.ts)
-- ====================================================================================================

-- Enhanced queue_jobs table with all fields used in the codebase
DROP TABLE IF EXISTS public.queue_jobs;
CREATE TABLE public.queue_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name VARCHAR(100) NOT NULL,
  job_id VARCHAR(255) NOT NULL UNIQUE,
  job_name VARCHAR(255),
  job_data JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  priority INTEGER DEFAULT 10,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  result JSONB,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for queue operations
CREATE INDEX IF NOT EXISTS idx_queue_jobs_status ON public.queue_jobs(status);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_queue_name ON public.queue_jobs(queue_name);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_priority ON public.queue_jobs(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_job_id ON public.queue_jobs(job_id);

-- ====================================================================================================
-- ARTIST SYNC TRACKING (Referenced in artist-sync services)
-- ====================================================================================================

-- Add missing columns to artists table if they don't exist
DO $$ 
BEGIN
  -- Add sync tracking columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'last_synced_at') THEN
    ALTER TABLE public.artists ADD COLUMN last_synced_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'shows_synced_at') THEN
    ALTER TABLE public.artists ADD COLUMN shows_synced_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'song_catalog_synced_at') THEN
    ALTER TABLE public.artists ADD COLUMN song_catalog_synced_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'last_full_sync_at') THEN
    ALTER TABLE public.artists ADD COLUMN last_full_sync_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'total_songs') THEN
    ALTER TABLE public.artists ADD COLUMN total_songs INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'total_albums') THEN
    ALTER TABLE public.artists ADD COLUMN total_albums INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'total_shows') THEN
    ALTER TABLE public.artists ADD COLUMN total_shows INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'upcoming_shows') THEN
    ALTER TABLE public.artists ADD COLUMN upcoming_shows INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'import_status') THEN
    ALTER TABLE public.artists ADD COLUMN import_status VARCHAR(50) DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'trending_score') THEN
    ALTER TABLE public.artists ADD COLUMN trending_score DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- ====================================================================================================
-- ARTIST-SONG RELATIONSHIP TABLE (Referenced in catalog sync)
-- ====================================================================================================

CREATE TABLE IF NOT EXISTS public.artist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id TEXT NOT NULL,
  song_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(artist_id, song_id)
);

-- Foreign key constraints
ALTER TABLE public.artist_songs 
ADD CONSTRAINT fk_artist_songs_artist_id 
FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;

ALTER TABLE public.artist_songs 
ADD CONSTRAINT fk_artist_songs_song_id 
FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;

-- Indexes for artist-song relationships
CREATE INDEX IF NOT EXISTS idx_artist_songs_artist_id ON public.artist_songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_songs_song_id ON public.artist_songs(song_id);

-- ====================================================================================================
-- USER FOLLOWS ARTISTS TABLE (Referenced in trending calculations)
-- ====================================================================================================

CREATE TABLE IF NOT EXISTS public.user_follows_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  artist_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, artist_id)
);

-- Indexes for user follows
CREATE INDEX IF NOT EXISTS idx_user_follows_artists_user_id ON public.user_follows_artists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_artists_artist_id ON public.user_follows_artists(artist_id);

-- ====================================================================================================
-- ENHANCED FUNCTIONS FOR IMPORT SYSTEM
-- ====================================================================================================

-- Function to update import status (used throughout import system)
CREATE OR REPLACE FUNCTION public.update_import_status(
  p_artist_id TEXT,
  p_stage TEXT,
  p_progress INTEGER DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_error TEXT DEFAULT NULL,
  p_job_id TEXT DEFAULT NULL,
  p_artist_name TEXT DEFAULT NULL,
  p_total_songs INTEGER DEFAULT NULL,
  p_total_shows INTEGER DEFAULT NULL,
  p_total_venues INTEGER DEFAULT NULL,
  p_completed_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $
DECLARE
  status_id UUID;
BEGIN
  INSERT INTO public.import_status (
    artist_id, stage, progress, message, error, job_id, 
    artist_name, total_songs, total_shows, total_venues, completed_at
  ) VALUES (
    p_artist_id, p_stage, p_progress, p_message, p_error, p_job_id,
    p_artist_name, p_total_songs, p_total_shows, p_total_venues, p_completed_at
  )
  ON CONFLICT (artist_id) DO UPDATE SET
    stage = EXCLUDED.stage,
    progress = COALESCE(EXCLUDED.progress, public.import_status.progress),
    message = COALESCE(EXCLUDED.message, public.import_status.message),
    error = EXCLUDED.error,
    job_id = COALESCE(EXCLUDED.job_id, public.import_status.job_id),
    artist_name = COALESCE(EXCLUDED.artist_name, public.import_status.artist_name),
    total_songs = COALESCE(EXCLUDED.total_songs, public.import_status.total_songs),
    total_shows = COALESCE(EXCLUDED.total_shows, public.import_status.total_shows),
    total_venues = COALESCE(EXCLUDED.total_venues, public.import_status.total_venues),
    completed_at = COALESCE(EXCLUDED.completed_at, public.import_status.completed_at),
    updated_at = NOW()
  RETURNING id INTO status_id;
  
  RETURN status_id;
END;
$ LANGUAGE plpgsql;

-- Function to clean up old import statuses
CREATE OR REPLACE FUNCTION public.cleanup_old_import_statuses(days_old INTEGER DEFAULT 7)
RETURNS INTEGER AS $
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.import_status 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_old
  AND stage IN ('completed', 'failed');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$ LANGUAGE plpgsql;

-- Function to get active imports
CREATE OR REPLACE FUNCTION public.get_active_imports()
RETURNS TABLE(
  artist_id TEXT,
  artist_name TEXT,
  stage TEXT,
  progress INTEGER,
  message TEXT,
  job_id TEXT,
  created_at TIMESTAMPTZ
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    i.artist_id,
    i.artist_name,
    i.stage,
    i.progress,
    i.message,
    i.job_id,
    i.created_at
  FROM public.import_status i
  WHERE i.stage NOT IN ('completed', 'failed')
  ORDER BY i.created_at DESC;
END;
$ LANGUAGE plpgsql;

-- ====================================================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ====================================================================================================

-- Trigger to update updated_at on import_status
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_import_status_updated_at
  BEFORE UPDATE ON public.import_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_queue_jobs_updated_at
  BEFORE UPDATE ON public.queue_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================================================================
-- ROW LEVEL SECURITY POLICIES
-- ====================================================================================================

-- Enable RLS on new tables
ALTER TABLE public.import_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows_artists ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access)
CREATE POLICY "Service role full access on import_status" ON public.import_status
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on artist_songs" ON public.artist_songs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on user_follows_artists" ON public.user_follows_artists
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Authenticated user policies
CREATE POLICY "Users can read import_status" ON public.import_status
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read artist_songs" ON public.artist_songs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their follows" ON public.user_follows_artists
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ====================================================================================================
-- PERFORMANCE OPTIMIZATIONS
-- ====================================================================================================

-- Update existing indexes for better performance
DROP INDEX IF EXISTS public.idx_artists_activity_lookup;
CREATE INDEX idx_artists_activity_lookup 
ON public.artists(last_synced_at, updated_at, popularity DESC) 
WHERE last_synced_at IS NOT NULL;

DROP INDEX IF EXISTS public.idx_artists_trending_score;
CREATE INDEX idx_artists_trending_score 
ON public.artists(trending_score DESC, updated_at) 
WHERE trending_score > 0;

-- Refresh the materialized view with new data
DROP MATERIALIZED VIEW IF EXISTS public.trending_artists_mv;
CREATE MATERIALIZED VIEW public.trending_artists_mv AS
SELECT 
  a.id,
  a.name,
  a.slug,
  a.image_url,
  a.trending_score,
  a.total_shows,
  COUNT(DISTINCT v.id) as recent_votes,
  MAX(s.date) as latest_show_date,
  COUNT(DISTINCT uf.user_id) as follower_count
FROM public.artists a
LEFT JOIN public.shows s ON s.headliner_artist_id = a.id
LEFT JOIN public.votes v ON v.artist_id = a.id AND v.created_at >= NOW() - INTERVAL '7 days'
LEFT JOIN public.user_follows_artists uf ON uf.artist_id = a.id
GROUP BY a.id, a.name, a.slug, a.image_url, a.trending_score, a.total_shows
ORDER BY a.trending_score DESC;

-- Indexes on materialized view
CREATE UNIQUE INDEX idx_trending_artists_mv_id ON public.trending_artists_mv(id);
CREATE INDEX idx_trending_artists_mv_trending ON public.trending_artists_mv(trending_score DESC);

-- ====================================================================================================
-- INITIAL DATA SETUP
-- ====================================================================================================

-- Log this migration
SELECT public.log_cron_run(
  'complete-missing-tables-migration', 
  'success',
  '{"migration": "20250825_complete_missing_tables", "tables_created": 4, "functions_created": 4, "indexes_created": 15}'::jsonb
);

-- Migration completed successfully