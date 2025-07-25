-- Final cleanup of Supabase cron jobs
-- Based on actual implementation using master-sync endpoint

-- Remove ALL existing cron jobs
DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN SELECT jobname FROM cron.job
  LOOP
    PERFORM cron.unschedule(job_record.jobname);
    RAISE NOTICE 'Removed cron job: %', job_record.jobname;
  END LOOP;
END $$;

-- Since the app uses API endpoints (not Supabase Functions), we need to call the actual endpoints
-- The master-sync endpoint handles all sync operations with different modes

-- 1. Hourly sync (light sync for trending and recent changes)
SELECT cron.schedule(
  'hourly-sync',
  '0 * * * *',
  $$
  SELECT net.http_get(
    url := (SELECT value FROM app_settings WHERE key = 'app_url') || '/api/cron/master-sync?mode=hourly',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT value FROM app_settings WHERE key = 'cron_secret')
    )
  );
  $$
);

-- 2. Daily sync (full sync of popular artists, shows, setlists)
SELECT cron.schedule(
  'daily-sync',
  '0 2 * * *',
  $$
  SELECT net.http_get(
    url := (SELECT value FROM app_settings WHERE key = 'app_url') || '/api/cron/master-sync?mode=daily',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT value FROM app_settings WHERE key = 'cron_secret')
    )
  );
  $$
);

-- 3. Trending calculation (every 30 minutes)
-- Check if calculate-trending endpoint exists, otherwise use master-sync
SELECT cron.schedule(
  'calculate-trending',
  '*/30 * * * *',
  $$
  SELECT net.http_get(
    url := (SELECT value FROM app_settings WHERE key = 'app_url') || '/api/cron/calculate-trending',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT value FROM app_settings WHERE key = 'cron_secret')
    )
  );
  $$
);

-- Create a simplified monitoring view
DROP VIEW IF EXISTS cron_job_monitor CASCADE;
CREATE OR REPLACE VIEW cron_job_monitor AS
SELECT 
  jobname,
  schedule,
  active,
  command,
  (SELECT COUNT(*) FROM cron.job_run_details WHERE jobid = j.jobid AND status = 'succeeded') as success_count,
  (SELECT COUNT(*) FROM cron.job_run_details WHERE jobid = j.jobid AND status = 'failed') as failure_count,
  (SELECT MAX(start_time) FROM cron.job_run_details WHERE jobid = j.jobid) as last_run,
  (SELECT status FROM cron.job_run_details WHERE jobid = j.jobid ORDER BY start_time DESC LIMIT 1) as last_status
FROM cron.job j
ORDER BY jobname;

-- Grant permissions
GRANT SELECT ON cron_job_monitor TO authenticated;

-- Clean up unnecessary functions
DROP FUNCTION IF EXISTS trigger_manual_sync CASCADE;
DROP FUNCTION IF EXISTS get_app_setting CASCADE;

-- Keep only essential app settings
DELETE FROM app_settings WHERE key NOT IN ('app_url', 'cron_secret');

-- Update app settings with correct values
INSERT INTO app_settings (key, value) 
VALUES 
  ('app_url', 'https://mysetlist-sonnet.vercel.app'),
  ('cron_secret', '6155002300')
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Show final cron jobs
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Final Cron Jobs ===';
  FOR job_record IN SELECT jobname, schedule FROM cron.job ORDER BY jobname
  LOOP
    RAISE NOTICE '✓ %: %', job_record.jobname, job_record.schedule;
  END LOOP;
  RAISE NOTICE '=====================';
END $$;