-- Update cron schedules for TheSet sync jobs

-- First unschedule existing cron jobs
SELECT cron.unschedule('hourly-scheduled-sync');
SELECT cron.unschedule('sync-artists-job');
SELECT cron.unschedule('update-trending-job');

-- Schedule artist sync every 6 hours
SELECT cron.schedule(
  'sync-artists-job',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url')::text || '/functions/v1/scheduled-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')::text
    ),
    body := jsonb_build_object('type', 'artists', 'limit', 20)
  );
  $$
);

-- Schedule trending update every 2 hours
SELECT cron.schedule(
  'update-trending-job',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url')::text || '/functions/v1/scheduled-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')::text
    ),
    body := jsonb_build_object('type', 'trending')
  );
  $$
);

-- Log the cron job setup
INSERT INTO public.cron_job_logs (job_name, status, message)
VALUES 
  ('sync-artists-job', 'scheduled', 'Artist sync scheduled for every 6 hours'),
  ('update-trending-job', 'scheduled', 'Trending update scheduled for every 2 hours');