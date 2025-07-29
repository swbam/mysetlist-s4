-- Update cron jobs to use correct Vercel app domain
-- Date: 2025-07-29
-- 
-- This migration updates cron jobs and app settings to use mysetlist-sonnet.vercel.app
-- instead of mysetlist.io

-- First, update app settings table
UPDATE app_settings 
SET value = 'https://mysetlist-sonnet.vercel.app', 
    updated_at = NOW()
WHERE key = 'app_url';

-- Update database-level settings
ALTER DATABASE postgres SET "app.settings.app_url" = 'https://mysetlist-sonnet.vercel.app';
ALTER DATABASE postgres SET "app.settings.cron_secret" = '6155002300';

-- Update the RPC functions to use the correct domain
CREATE OR REPLACE FUNCTION trigger_master_sync(mode text DEFAULT 'daily')
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  app_url text;
  cron_secret text;
BEGIN
  -- Get app URL and cron secret from settings
  SELECT value INTO app_url FROM app_settings WHERE key = 'app_url';
  SELECT value INTO cron_secret FROM app_settings WHERE key = 'cron_secret';
  
  -- Fallback to correct domain if not found
  IF app_url IS NULL THEN
    app_url := 'https://mysetlist-sonnet.vercel.app';
  END IF;
  
  IF cron_secret IS NULL THEN
    cron_secret := '6155002300';
  END IF;
  
  -- Make HTTP request to master sync API
  SELECT content::jsonb INTO result
  FROM http((
    'GET',
    app_url || '/api/cron/master-sync?mode=' || mode,
    ARRAY[
      http_header('Authorization', 'Bearer ' || cron_secret),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    ''
  )::http_request);
  
  -- Log the sync
  INSERT INTO public.cron_job_logs (job_name, status, message, details, created_at)
  VALUES (
    'master-sync-' || mode,
    CASE WHEN result->>'success' = 'true' THEN 'completed' ELSE 'failed' END,
    'Master sync triggered via RPC',
    result,
    NOW()
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    INSERT INTO public.cron_job_logs (job_name, status, message, details, created_at)
    VALUES (
      'master-sync-' || mode,
      'error',
      'Error triggering master sync: ' || SQLERRM,
      jsonb_build_object('error', SQLERRM, 'url', app_url),
      NOW()
    );
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_trending_update()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  app_url text;
  cron_secret text;
BEGIN
  -- Get app URL and cron secret from settings
  SELECT value INTO app_url FROM app_settings WHERE key = 'app_url';
  SELECT value INTO cron_secret FROM app_settings WHERE key = 'cron_secret';
  
  -- Fallback to correct domain if not found
  IF app_url IS NULL THEN
    app_url := 'https://mysetlist-sonnet.vercel.app';
  END IF;
  
  IF cron_secret IS NULL THEN
    cron_secret := '6155002300';
  END IF;
  
  -- Make HTTP request to trending API
  SELECT content::jsonb INTO result
  FROM http((
    'GET',
    app_url || '/api/cron/trending',
    ARRAY[
      http_header('Authorization', 'Bearer ' || cron_secret),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    ''
  )::http_request);
  
  -- Log the update
  INSERT INTO public.cron_job_logs (job_name, status, message, details, created_at)
  VALUES (
    'trending-update',
    CASE WHEN result->>'success' = 'true' THEN 'completed' ELSE 'failed' END,
    'Trending update triggered via RPC',
    result,
    NOW()
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    INSERT INTO public.cron_job_logs (job_name, status, message, details, created_at)
    VALUES (
      'trending-update',
      'error',
      'Error triggering trending update: ' || SQLERRM,
      jsonb_build_object('error', SQLERRM, 'url', app_url),
      NOW()
    );
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate cron jobs with correct intervals
-- First unschedule existing ones
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('sync-artists-job', 'update-trending-job');

-- Schedule artist sync every 6 hours
SELECT cron.schedule(
  'sync-artists-job',
  '0 */6 * * *',
  $$SELECT trigger_master_sync('daily');$$
);

-- Schedule trending update every 2 hours  
SELECT cron.schedule(
  'update-trending-job',
  '0 */2 * * *',
  $$SELECT trigger_trending_update();$$
);

-- Log the update
INSERT INTO public.cron_job_logs (job_name, status, message, created_at)
VALUES 
  ('cron-domain-update', 'completed', 'Updated cron jobs to use mysetlist-sonnet.vercel.app', NOW());

-- Verify the configuration
SELECT * FROM app_settings WHERE key IN ('app_url', 'cron_secret');
SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;