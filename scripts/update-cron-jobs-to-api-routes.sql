-- SQL script to update all cron jobs to use API routes instead of edge functions
-- Run this in Supabase SQL Editor after deleting all edge functions

-- First, check current cron jobs
SELECT 
    jobname,
    schedule,
    command
FROM cron.job
ORDER BY jobname;

-- Delete all existing cron jobs that use edge functions
DELETE FROM cron.job 
WHERE command LIKE '%edge.supabase.com%' 
   OR command LIKE '%supabase_edge_runtime%'
   OR command LIKE '%invoke-edge-function%';

-- Create new cron jobs that call API routes directly

-- 1. Hourly sync (shows and trending)
SELECT cron.schedule(
  'hourly-sync',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.app_url') || '/api/cron/master-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('mode', 'hourly')
  );
  $$
);

-- 2. Daily sync (artists and comprehensive data)
SELECT cron.schedule(
  'daily-sync',
  '0 2 * * *', -- 2 AM daily
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.app_url') || '/api/cron/master-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('mode', 'daily')
  );
  $$
);

-- 3. Calculate trending (every 6 hours)
SELECT cron.schedule(
  'calculate-trending',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.app_url') || '/api/cron/calculate-trending',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('period', 'last_24_hours')
  );
  $$
);

-- 4. Email processing (every 5 minutes)
SELECT cron.schedule(
  'process-emails',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.app_url') || '/api/cron/email-processor',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- 5. Weekly backup (Sundays at 3 AM)
SELECT cron.schedule(
  'weekly-backup',
  '0 3 * * 0', -- Sunday 3 AM
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.app_url') || '/api/cron/backup',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('type', 'incremental')
  );
  $$
);

-- Update app settings if not already set
INSERT INTO app.settings (name, value)
VALUES 
  ('app_url', 'https://mysetlist.io'),
  ('cron_secret', current_setting('app.settings.cron_secret', true))
ON CONFLICT (name) DO UPDATE
SET value = EXCLUDED.value
WHERE app.settings.value IS NULL;

-- Verify the new cron jobs
SELECT 
    jobname,
    schedule,
    command
FROM cron.job
ORDER BY jobname;

-- Log the migration
INSERT INTO public.cron_job_logs (job_name, status, message, created_at)
VALUES 
  ('cron-migration', 'completed', 'Migrated all cron jobs from edge functions to API routes', NOW());