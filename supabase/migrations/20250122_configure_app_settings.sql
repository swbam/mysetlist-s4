-- Configure App Settings for Cron Jobs
-- This migration updates app_settings with the correct values for production

-- Ensure app_settings table exists
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert or update app settings
INSERT INTO app_settings (key, value) 
VALUES 
  ('app_url', 'https://theset.live'),
  ('cron_secret', '6155002300'), -- As specified in the docs
  ('supabase_url', current_setting('app.settings.supabase_url', true)),
  ('supabase_anon_key', current_setting('app.settings.supabase_anon_key', true))
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Set database-level settings for cron jobs to access
-- NOTE: Replace with your actual Supabase values
ALTER DATABASE postgres SET "app.settings.supabase_url" = 'https://yzwkimtdaabyjbpykquu.supabase.co';
ALTER DATABASE postgres SET "app.settings.supabase_service_role_key" = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY5MjMxNiwiZXhwIjoyMDY2MjY4MzE2fQ.ZMorLC_eZke3bvBAF0zyzqUONxpomfTN2RpE_mLjz18';

-- Create a function to get the current configuration
CREATE OR REPLACE FUNCTION get_cron_config()
RETURNS TABLE (
  setting_key TEXT,
  setting_value TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT key, value FROM app_settings
  WHERE key IN ('app_url', 'cron_secret', 'supabase_url', 'supabase_anon_key')
  ORDER BY key;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_cron_config TO authenticated;

-- Verify configuration
SELECT * FROM get_cron_config();