-- Script to update the cron secret after deployment
-- Run this with your actual secret value from environment

-- Replace 'YOUR_ACTUAL_CRON_SECRET' with the value from your CRON_SECRET environment variable
ALTER DATABASE postgres SET "app.settings.cron_secret" = 'YOUR_ACTUAL_CRON_SECRET';

-- Update the app_settings table
UPDATE app_settings 
SET value = 'YOUR_ACTUAL_CRON_SECRET' 
WHERE key = 'cron_secret';

-- Verify the update
SELECT key, value FROM app_settings WHERE key = 'cron_secret';