-- Ensure pg_cron and pg_net enabled (handled in earlier migration, but safe-guard)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the scheduled-sync function every hour
SELECT cron.schedule(
  'hourly-scheduled-sync',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url')::text || '/functions/v1/scheduled-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')::text
    ),
    body := jsonb_build_object('type','all','limit',20)
  );
  $$
);