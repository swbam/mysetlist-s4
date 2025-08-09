-- Consolidate cron jobs to 3 unified pipelines calling Next.js API endpoints

-- Remove all existing cron jobs
DO $$
DECLARE job_record RECORD;
BEGIN
  FOR job_record IN SELECT jobname FROM cron.job LOOP
    PERFORM cron.unschedule(job_record.jobname);
  END LOOP;
END $$;

-- Ensure app settings exist
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- NOTE: set these via SQL editor with your values after deploy
-- INSERT INTO app_settings(key, value) VALUES
--   ('app_url', 'https://mysetlist-sonnet.vercel.app'),
--   ('cron_secret', 'REPLACE_WITH_SECURE_RANDOM')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Hourly light sync
SELECT cron.schedule(
  'hourly-sync',
  '0 * * * *',
  $$
  SELECT net.http_get(
    url := (SELECT value FROM app_settings WHERE key='app_url') || '/api/cron/master-sync?mode=hourly',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (SELECT value FROM app_settings WHERE key='cron_secret'))
  );
  $$
);

-- Daily full sync at 2 AM
SELECT cron.schedule(
  'daily-sync',
  '0 2 * * *',
  $$
  SELECT net.http_get(
    url := (SELECT value FROM app_settings WHERE key='app_url') || '/api/cron/master-sync?mode=daily',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (SELECT value FROM app_settings WHERE key='cron_secret'))
  );
  $$
);

-- Trending refresh every 30 minutes
SELECT cron.schedule(
  'calculate-trending',
  '*/30 * * * *',
  $$
  SELECT net.http_get(
    url := (SELECT value FROM app_settings WHERE key='app_url') || '/api/cron/calculate-trending',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (SELECT value FROM app_settings WHERE key='cron_secret'))
  );
  $$
);


