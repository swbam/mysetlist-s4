-- Migration: Update all references to use theset.live domain
-- This migration updates cron jobs and functions to use the new TheSet domain

-- Drop existing functions first
DROP FUNCTION IF EXISTS trigger_calculate_trending_api() CASCADE;
DROP FUNCTION IF EXISTS trigger_sync_artist_data_api() CASCADE;
DROP FUNCTION IF EXISTS trigger_master_sync_api(text) CASCADE;

-- Recreate functions with theset.live domain
CREATE OR REPLACE FUNCTION trigger_calculate_trending_api()
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT content::jsonb INTO result FROM http((
        'POST',
        'https://theset.live/api/cron/calculate-trending',
        ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'))],
        'application/json',
        '{}'
    )::http_request);
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_sync_artist_data_api()
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT content::jsonb INTO result FROM http((
        'POST',
        'https://theset.live/api/cron/sync-artist-data',
        ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'))],
        'application/json',
        '{"limit": 10}'
    )::http_request);
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_master_sync_api(mode text DEFAULT 'daily')
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT content::jsonb INTO result FROM http((
        'POST',
        'https://theset.live/api/cron/master-sync',
        ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'))],
        'application/json',
        json_build_object('mode', mode)::text
    )::http_request);
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update app_settings table to use theset.live
UPDATE app_settings 
SET value = 'https://theset.live' 
WHERE key = 'app_url';

-- Update any existing cron job logs
UPDATE cron_job_logs 
SET details = jsonb_set(
  COALESCE(details, '{}'::jsonb),
  '{domain}',
  '"theset.live"'::jsonb
) 
WHERE details->>'domain' LIKE '%mysetlist%' 
   OR details->>'domain' IS NULL;

-- Add comment to track migration
COMMENT ON SCHEMA public IS 'TheSet database schema - domain updated to theset.live on 2025-08-13';