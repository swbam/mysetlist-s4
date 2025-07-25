-- Fix hardcoded cron configuration values
-- This migration updates the hardcoded URLs and secrets to use environment-based values

-- First, update the app_settings table to remove hardcoded values
UPDATE app_settings 
SET value = CASE 
  WHEN key = 'app_url' THEN 'https://mysetlist.com' -- Will be overridden by environment
  WHEN key = 'cron_secret' THEN gen_random_uuid()::text -- Generate a secure random secret
  ELSE value
END
WHERE key IN ('app_url', 'cron_secret');

-- Create a function to get app URL from environment or fallback
CREATE OR REPLACE FUNCTION get_app_url()
RETURNS text AS $$
BEGIN
  -- In production, this should be set via environment variable
  -- For now, return a placeholder that indicates configuration is needed
  RETURN coalesce(
    current_setting('app.settings.app_url', true),
    'https://mysetlist.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to validate cron requests
CREATE OR REPLACE FUNCTION validate_cron_secret(provided_secret text)
RETURNS boolean AS $$
DECLARE
  stored_secret text;
BEGIN
  -- Get the stored secret from app_settings
  SELECT value INTO stored_secret
  FROM app_settings
  WHERE key = 'cron_secret';
  
  -- In production, also check against environment variable
  RETURN provided_secret IS NOT NULL AND (
    provided_secret = stored_secret OR
    provided_secret = current_setting('app.settings.cron_secret', true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the cron job configurations to use dynamic URLs
-- First, let's check if pg_cron is available
DO $$
BEGIN
  -- Only proceed if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove old cron jobs with hardcoded URLs
    PERFORM cron.unschedule(jobname) 
    FROM cron.job 
    WHERE jobname IN ('hourly-sync', 'daily-sync', 'calculate-trending');

    -- Note: New cron jobs should be created by the application
    -- using environment-based URLs, not hardcoded in migrations
    
    -- Add a comment to document the required cron jobs
    COMMENT ON TABLE app_settings IS 
    'Application settings table. Required cron jobs:
    1. hourly-sync: Sync data every hour
    2. daily-sync: Daily sync at 2 AM
    3. calculate-trending: Update trending scores every 30 minutes
    
    These should be configured through the application using environment variables.';
  END IF;
END $$;

-- Add indexes for better performance on app_settings lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Add a migration record to track this fix
INSERT INTO app_settings (key, value, created_at, updated_at)
VALUES ('migration_fix_hardcoded_values', '2025-01-24', now(), now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Add documentation
COMMENT ON FUNCTION get_app_url() IS 'Returns the application URL, should be overridden by environment configuration';
COMMENT ON FUNCTION validate_cron_secret(text) IS 'Validates cron job authentication secrets';