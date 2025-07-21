-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to postgres
GRANT USAGE ON SCHEMA cron TO postgres;

-- Set the service role key for cron jobs
-- IMPORTANT: Replace this with your actual service role key
ALTER DATABASE postgres SET "app.settings.service_role_key" = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY5MjMxNiwiZXhwIjoyMDY2MjY4MzE2fQ.ZMorLC_eZke3bvBAF0zyzqUONxpomfTN2RpE_mLjz18';

-- Enable pg_net for HTTP requests from cron jobs
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Daily trending update (3 AM UTC)
SELECT cron.schedule(
  'update-trending-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    'https://yzwkimtdaabyjbpykquu.supabase.co/functions/v1/update-trending',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Hourly show sync (every hour)
SELECT cron.schedule(
  'sync-shows-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    'https://yzwkimtdaabyjbpykquu.supabase.co/functions/v1/sync-shows',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Weekly artist sync (Sundays at 2 AM UTC)
SELECT cron.schedule(
  'sync-artists-weekly',
  '0 2 * * 0',
  $$
  SELECT net.http_post(
    'https://yzwkimtdaabyjbpykquu.supabase.co/functions/v1/sync-artists',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Daily setlist sync (4 AM UTC)
SELECT cron.schedule(
  'sync-setlists-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    'https://yzwkimtdaabyjbpykquu.supabase.co/functions/v1/sync-setlists',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- View all scheduled cron jobs
SELECT * FROM cron.job;

-- View recent cron job runs
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;