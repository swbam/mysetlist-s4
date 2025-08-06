-- Fix cron jobs to use API routes instead of non-existent edge functions
-- Date: 2025-07-29
-- 
-- This migration updates cron jobs that were calling edge functions
-- to instead call the API routes directly. All edge functions have been
-- removed as their functionality is handled by API routes.

-- First, unschedule existing cron jobs that use edge functions
SELECT cron.unschedule('sync-artists-job');
SELECT cron.unschedule('update-trending-job');

-- Schedule artist sync every 6 hours - calls master sync API
SELECT cron.schedule(
  'sync-artists-job',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url')::text || '/rest/v1/rpc/trigger_master_sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')::text
    ),
    body := jsonb_build_object('mode', 'daily')
  );
  $$
);

-- Schedule trending update every 2 hours - calls master sync API
SELECT cron.schedule(
  'update-trending-job',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url')::text || '/rest/v1/rpc/trigger_trending_update',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')::text
    ),
    body := jsonb_build_object('mode', 'hourly')
  );
  $$
);

-- Create RPC functions to trigger API endpoints
-- These functions will be called by cron jobs and will make HTTP requests to our API
CREATE OR REPLACE FUNCTION trigger_master_sync(mode text DEFAULT 'daily')
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  app_url text;
  cron_secret text;
BEGIN
  -- Get app URL and cron secret from settings
  app_url := current_setting('app.settings.app_url', true);
  cron_secret := current_setting('app.settings.cron_secret', true);
  
  -- If settings not found, use environment defaults
  IF app_url IS NULL THEN
    app_url := 'https://theset.live';
  END IF;
  
  -- Make HTTP request to master sync API
  SELECT content::jsonb INTO result
  FROM http((
    'GET',
    app_url || '/api/cron/master-sync?mode=' || mode,
    ARRAY[
      http_header('Authorization', 'Bearer ' || COALESCE(cron_secret, 'default-secret')),
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
  app_url := current_setting('app.settings.app_url', true);
  cron_secret := current_setting('app.settings.cron_secret', true);
  
  -- If settings not found, use environment defaults
  IF app_url IS NULL THEN
    app_url := 'https://theset.live';
  END IF;
  
  -- Make HTTP request to trending API
  SELECT content::jsonb INTO result
  FROM http((
    'GET',
    app_url || '/api/cron/trending',
    ARRAY[
      http_header('Authorization', 'Bearer ' || COALESCE(cron_secret, 'default-secret')),
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log the cron job updates
INSERT INTO public.cron_job_logs (job_name, status, message, created_at)
VALUES 
  ('edge-function-cleanup', 'completed', 'Updated cron jobs to use API routes instead of edge functions', NOW()),
  ('sync-artists-job', 'updated', 'Now calls master sync API via RPC function', NOW()),
  ('update-trending-job', 'updated', 'Now calls trending API via RPC function', NOW());

-- Grant execute permissions on the new functions
GRANT EXECUTE ON FUNCTION trigger_master_sync TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION trigger_trending_update TO postgres, anon, authenticated, service_role;