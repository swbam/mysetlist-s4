-- Fix cron jobs and data sync for MySetlist
-- This migration sets up proper cron jobs for artist data sync

-- First, ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO postgres;

-- Remove any existing cron jobs
DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN SELECT jobname FROM cron.job
  LOOP
    PERFORM cron.unschedule(job_record.jobname);
  END LOOP;
END $$;

-- Create function to sync artist data
CREATE OR REPLACE FUNCTION sync_artist_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_url text;
  cron_secret text;
  response json;
BEGIN
  -- Get app URL and cron secret from settings
  app_url := COALESCE(
    current_setting('app.settings.app_url', true),
    'https://mysetlist-s4-1.vercel.app'
  );
  
  cron_secret := COALESCE(
    current_setting('app.settings.cron_secret', true),
    '6155002300'
  );

  -- Make HTTP request to sync endpoint
  SELECT content::json INTO response
  FROM http_post(
    app_url || '/api/cron/sync-artist-data',
    '{}',
    'application/json',
    ARRAY[
      http_header('Authorization', 'Bearer ' || cron_secret),
      http_header('Content-Type', 'application/json')
    ]
  );

  -- Log the result
  INSERT INTO public.cron_job_logs (job_name, status, message, details, created_at)
  VALUES (
    'sync-artist-data',
    CASE WHEN response->>'success' = 'true' THEN 'success' ELSE 'failed' END,
    'Artist data sync completed',
    response,
    NOW()
  );
END;
$$;

-- Create function for master sync
CREATE OR REPLACE FUNCTION run_master_sync(mode text DEFAULT 'hourly')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_url text;
  cron_secret text;
  response json;
BEGIN
  -- Get app URL and cron secret from settings
  app_url := COALESCE(
    current_setting('app.settings.app_url', true),
    'https://mysetlist-s4-1.vercel.app'
  );
  
  cron_secret := COALESCE(
    current_setting('app.settings.cron_secret', true),
    '6155002300'
  );

  -- Make HTTP request to master sync endpoint
  SELECT content::json INTO response
  FROM http_post(
    app_url || '/api/cron/master-sync?mode=' || mode,
    '{}',
    'application/json',
    ARRAY[
      http_header('Authorization', 'Bearer ' || cron_secret),
      http_header('Content-Type', 'application/json')
    ]
  );

  -- Log the result
  INSERT INTO public.cron_job_logs (job_name, status, message, details, created_at)
  VALUES (
    'master-sync-' || mode,
    CASE WHEN response->>'success' = 'true' THEN 'success' ELSE 'failed' END,
    'Master sync completed for mode: ' || mode,
    response,
    NOW()
  );
END;
$$;

-- Create function for trending updates
CREATE OR REPLACE FUNCTION update_trending_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_url text;
  cron_secret text;
  response json;
BEGIN
  -- Get app URL and cron secret from settings
  app_url := COALESCE(
    current_setting('app.settings.app_url', true),
    'https://mysetlist-s4-1.vercel.app'
  );
  
  cron_secret := COALESCE(
    current_setting('app.settings.cron_secret', true),
    '6155002300'
  );

  -- Make HTTP request to trending endpoint
  SELECT content::json INTO response
  FROM http_post(
    app_url || '/api/cron/calculate-trending',
    '{}',
    'application/json',
    ARRAY[
      http_header('Authorization', 'Bearer ' || cron_secret),
      http_header('Content-Type', 'application/json')
    ]
  );

  -- Log the result
  INSERT INTO public.cron_job_logs (job_name, status, message, details, created_at)
  VALUES (
    'update-trending',
    CASE WHEN response->>'success' = 'true' THEN 'success' ELSE 'failed' END,
    'Trending scores updated',
    response,
    NOW()
  );
END;
$$;

-- Schedule the cron jobs
SELECT cron.schedule(
  'sync-artist-data-hourly',
  '0 * * * *', -- Every hour
  'SELECT sync_artist_data();'
);

SELECT cron.schedule(
  'master-sync-daily',
  '0 2 * * *', -- Daily at 2 AM
  'SELECT run_master_sync(''daily'');'
);

SELECT cron.schedule(
  'update-trending-every-30min',
  '*/30 * * * *', -- Every 30 minutes
  'SELECT update_trending_scores();'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shows_headliner_artist_id ON shows(headliner_artist_id);
CREATE INDEX IF NOT EXISTS idx_shows_date ON shows(date);
CREATE INDEX IF NOT EXISTS idx_artist_songs_artist_id ON artist_songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_id ON setlist_songs(setlist_id);
CREATE INDEX IF NOT EXISTS idx_votes_setlist_song_id ON votes(setlist_song_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);

-- Update app settings
INSERT INTO app_settings (key, value, created_at, updated_at)
VALUES 
  ('app_url', 'https://mysetlist-s4-1.vercel.app', NOW(), NOW()),
  ('cron_secret', '6155002300', NOW(), NOW())
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = NOW();

-- Log the setup
INSERT INTO public.cron_job_logs (job_name, status, message, created_at)
VALUES ('cron-setup', 'completed', 'Cron jobs configured for production', NOW());

-- Show configured jobs
DO $$
DECLARE
  job_record RECORD;
BEGIN
  RAISE NOTICE 'Configured cron jobs:';
  FOR job_record IN SELECT jobname, schedule FROM cron.job ORDER BY jobname
  LOOP
    RAISE NOTICE '  - %: %', job_record.jobname, job_record.schedule;
  END LOOP;
END $$;