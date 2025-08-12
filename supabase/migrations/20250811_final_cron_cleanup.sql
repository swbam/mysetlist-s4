-- Final cleanup and fix for cron jobs and sync system
-- This migration ensures all cron jobs are properly configured and working

-- First, clear out any old/broken cron jobs
DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN SELECT jobname FROM cron.job WHERE jobname LIKE '%sync%' OR jobname LIKE '%trending%'
  LOOP
    PERFORM cron.unschedule(job_record.jobname);
  END LOOP;
END $$;

-- Update cron job functions to use the correct API endpoints
CREATE OR REPLACE FUNCTION trigger_master_sync_api(mode text DEFAULT 'daily')
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  app_url text;
  cron_secret text;
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
  
  -- Make HTTP request to master sync API
  SELECT content::jsonb INTO result
  FROM http_post(
    app_url || '/api/cron/master-sync',
    jsonb_build_object('mode', mode),
    'application/json',
    ARRAY[
      http_header('Authorization', 'Bearer ' || cron_secret),
      http_header('Content-Type', 'application/json')
    ]
  );
  
  -- Log the sync result
  INSERT INTO public.cron_job_logs (job_name, status, message, details, created_at)
  VALUES (
    'master-sync-' || mode,
    CASE WHEN result->>'success' = 'true' THEN 'completed' ELSE 'failed' END,
    COALESCE(result->>'message', 'Master sync via API'),
    result,
    NOW()
  );
  
  RETURN COALESCE(result, '{"success": false, "error": "No response"}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_trending_update_api()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  app_url text;
  cron_secret text;
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
  
  -- Make HTTP request to trending API
  SELECT content::jsonb INTO result
  FROM http_post(
    app_url || '/api/cron/calculate-trending',
    '{}',
    'application/json',
    ARRAY[
      http_header('Authorization', 'Bearer ' || cron_secret),
      http_header('Content-Type', 'application/json')
    ]
  );
  
  -- Log the update result
  INSERT INTO public.cron_job_logs (job_name, status, message, details, created_at)
  VALUES (
    'trending-update',
    CASE WHEN result->>'success' = 'true' THEN 'completed' ELSE 'failed' END,
    COALESCE(result->>'message', 'Trending update via API'),
    result,
    NOW()
  );
  
  RETURN COALESCE(result, '{"success": false, "error": "No response"}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_artist_sync_api()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  app_url text;
  cron_secret text;
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
  
  -- Make HTTP request to artist sync API
  SELECT content::jsonb INTO result
  FROM http_post(
    app_url || '/api/cron/sync-artist-data',
    jsonb_build_object('limit', 20, 'mode', 'auto'),
    'application/json',
    ARRAY[
      http_header('Authorization', 'Bearer ' || cron_secret),
      http_header('Content-Type', 'application/json')
    ]
  );
  
  -- Log the sync result
  INSERT INTO public.cron_job_logs (job_name, status, message, details, created_at)
  VALUES (
    'artist-sync',
    CASE WHEN result->>'success' = 'true' THEN 'completed' ELSE 'failed' END,
    COALESCE(result->>'message', 'Artist sync via API'),
    result,
    NOW()
  );
  
  RETURN COALESCE(result, '{"success": false, "error": "No response"}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_finish_mysetlist_sync_api()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  app_url text;
  cron_secret text;
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
  
  -- Make HTTP request to finish sync API (initializes setlists for shows)
  SELECT content::jsonb INTO result
  FROM http_post(
    app_url || '/api/cron/finish-mysetlist-sync',
    jsonb_build_object('mode', 'daily'),
    'application/json',
    ARRAY[
      http_header('Authorization', 'Bearer ' || cron_secret),
      http_header('Content-Type', 'application/json')
    ]
  );
  
  -- Log the sync result
  INSERT INTO public.cron_job_logs (job_name, status, message, details, created_at)
  VALUES (
    'finish-mysetlist-sync',
    CASE WHEN result->>'success' = 'true' THEN 'completed' ELSE 'failed' END,
    COALESCE(result->>'message', 'Finish MySetlist sync via API'),
    result,
    NOW()
  );
  
  RETURN COALESCE(result, '{"success": false, "error": "No response"}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the corrected cron jobs
SELECT cron.schedule(
  'master-sync-daily',
  '0 2 * * *', -- Daily at 2 AM
  'SELECT trigger_master_sync_api(''daily'');'
);

SELECT cron.schedule(
  'artist-sync-hourly',
  '0 * * * *', -- Every hour
  'SELECT trigger_artist_sync_api();'
);

SELECT cron.schedule(
  'trending-update-every-30min',
  '*/30 * * * *', -- Every 30 minutes
  'SELECT trigger_trending_update_api();'
);

SELECT cron.schedule(
  'finish-mysetlist-sync-daily',
  '0 4 * * *', -- Daily at 4:00 AM
  'SELECT trigger_finish_mysetlist_sync_api();'
);

-- Ensure app settings are properly configured
INSERT INTO app_settings (key, value, created_at, updated_at)
VALUES 
  ('app_url', 'https://mysetlist-s4-1.vercel.app', NOW(), NOW()),
  ('cron_secret', '6155002300', NOW(), NOW())
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = NOW();

-- Grant execute permissions on all sync functions
GRANT EXECUTE ON FUNCTION trigger_master_sync_api TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION trigger_trending_update_api TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION trigger_artist_sync_api TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION trigger_finish_mysetlist_sync_api TO postgres, anon, authenticated, service_role;

-- Create a function to manually trigger all syncs (for testing)
CREATE OR REPLACE FUNCTION trigger_all_syncs()
RETURNS jsonb AS $$
DECLARE
  master_result jsonb;
  trending_result jsonb;
  artist_result jsonb;
  finish_result jsonb;
  combined_result jsonb;
BEGIN
  -- Trigger all sync operations
  SELECT trigger_master_sync_api('hourly') INTO master_result;
  SELECT trigger_trending_update_api() INTO trending_result;
  SELECT trigger_artist_sync_api() INTO artist_result;
  SELECT trigger_finish_mysetlist_sync_api() INTO finish_result;
  
  -- Combine results
  combined_result := jsonb_build_object(
    'master_sync', master_result,
    'trending_update', trending_result,
    'artist_sync', artist_result,
    'finish_sync', finish_result,
    'triggered_at', NOW()
  );
  
  -- Log the combined operation
  INSERT INTO public.cron_job_logs (job_name, status, message, details, created_at)
  VALUES (
    'manual-all-syncs',
    'completed',
    'All sync operations triggered manually',
    combined_result,
    NOW()
  );
  
  RETURN combined_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION trigger_all_syncs TO postgres, anon, authenticated, service_role;

-- Log the final setup
INSERT INTO public.cron_job_logs (job_name, status, message, created_at)
VALUES ('final-cron-setup', 'completed', 'All cron jobs and sync system configured and ready', NOW());

-- Show current cron job status
DO $$
DECLARE
  job_record RECORD;
BEGIN
  RAISE NOTICE 'Current cron jobs:';
  FOR job_record IN SELECT jobname, schedule, active FROM cron.job ORDER BY jobname
  LOOP
    RAISE NOTICE '  - %: % (active: %)', job_record.jobname, job_record.schedule, job_record.active;
  END LOOP;
END $$;