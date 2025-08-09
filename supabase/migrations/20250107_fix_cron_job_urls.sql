-- Fix cron job URLs to use production domain
-- Update all cron jobs to point to https://mysetlist-sonnet.vercel.app

-- Update calculate-trending job
UPDATE cron.job 
SET command = ' SELECT net.http_post(
        url := ''https://mysetlist-sonnet.vercel.app/api/cron/calculate-trending'',
        headers := jsonb_build_object(''Authorization'', ''Bearer ' || current_setting('app.settings.cron_secret', true) || '''),
        timeout_milliseconds := 60000
     ); '
WHERE jobname = 'calculate-trending';

-- Update hourly-light-sync job
UPDATE cron.job 
SET command = ' SELECT net.http_post(
        url := ''https://mysetlist-sonnet.vercel.app/api/cron/master-sync?mode=hourly'',
        headers := jsonb_build_object(''Authorization'', ''Bearer ' || current_setting('app.settings.cron_secret', true) || '''),
        timeout_milliseconds := 60000
     ); '
WHERE jobname = 'hourly-light-sync';

-- Update nightly-deep-sync job
UPDATE cron.job 
SET command = ' SELECT net.http_post(
        url := ''https://mysetlist-sonnet.vercel.app/api/cron/master-sync?mode=daily'',
        headers := jsonb_build_object(''Authorization'', ''Bearer ' || current_setting('app.settings.cron_secret', true) || '''),
        timeout_milliseconds := 300000
     ); '
WHERE jobname = 'nightly-deep-sync';

-- Create new song sync job
INSERT INTO cron.job (jobname, schedule, command)
VALUES (
  'sync-artist-songs',
  '45 * * * *', -- Run at :45 every hour
  ' SELECT net.http_post(
        url := ''https://mysetlist-sonnet.vercel.app/api/cron/master-sync?mode=songs'',
        headers := jsonb_build_object(''Authorization'', ''Bearer ' || current_setting('app.settings.cron_secret', true) || '''),
        timeout_milliseconds := 180000
     ); '
)
ON CONFLICT (jobname) DO UPDATE
SET schedule = EXCLUDED.schedule,
    command = EXCLUDED.command;

-- Ensure all jobs are active
UPDATE cron.job 
SET active = true
WHERE jobname IN ('calculate-trending', 'hourly-light-sync', 'nightly-deep-sync', 'sync-artist-songs');
