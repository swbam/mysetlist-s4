-- Setup cron jobs for automatic sync operations
-- These jobs will run on schedule to keep data fresh

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to postgres
GRANT USAGE ON SCHEMA cron TO postgres;

-- Remove existing cron jobs if they exist
SELECT cron.unschedule(jobname) 
FROM cron.job 
WHERE jobname IN (
  'sync-trending-artists',
  'sync-artist-shows', 
  'sync-popular-artists',
  'update-trending-scores',
  'cleanup-old-imports'
);

-- 1. Sync trending artists every 6 hours
SELECT cron.schedule(
  'sync-trending-artists',
  '0 */6 * * *',  -- Every 6 hours
  $$
    SELECT net.http_post(
      url := 'https://' || current_setting('app.supabase_project_ref') || '.supabase.co/functions/v1/sync-artists',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'type', 'trending',
        'limit', 50
      )
    );
  $$
);

-- 2. Sync shows for active artists every 12 hours
SELECT cron.schedule(
  'sync-artist-shows',
  '0 */12 * * *',  -- Every 12 hours
  $$
    SELECT net.http_post(
      url := 'https://' || current_setting('app.supabase_project_ref') || '.supabase.co/functions/v1/sync-shows',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'type', 'active_artists'
      )
    );
  $$
);

-- 3. Sync popular artists daily at 2 AM
SELECT cron.schedule(
  'sync-popular-artists',
  '0 2 * * *',  -- Daily at 2 AM
  $$
    SELECT net.http_post(
      url := 'https://' || current_setting('app.supabase_project_ref') || '.supabase.co/functions/v1/sync-artists',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'type', 'popular',
        'limit', 100
      )
    );
  $$
);

-- 4. Update trending scores every hour
SELECT cron.schedule(
  'update-trending-scores',
  '0 * * * *',  -- Every hour
  $$
    SELECT net.http_post(
      url := 'https://' || current_setting('app.supabase_project_ref') || '.supabase.co/functions/v1/update-trending',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
        'Content-Type', 'application/json'
      )
    );
  $$
);

-- 5. Cleanup old import status records weekly
SELECT cron.schedule(
  'cleanup-old-imports',
  '0 3 * * 0',  -- Weekly on Sunday at 3 AM
  $$
    DELETE FROM import_status 
    WHERE completed_at < NOW() - INTERVAL '30 days'
    AND status = 'completed';
  $$
);

-- Log the cron job setup
INSERT INTO cron_logs (job_name, status, details, run_at)
VALUES 
  ('setup-cron-jobs', 'success', jsonb_build_object(
    'jobs_created', 5,
    'jobs', jsonb_build_array(
      'sync-trending-artists',
      'sync-artist-shows',
      'sync-popular-artists',
      'update-trending-scores',
      'cleanup-old-imports'
    )
  ), NOW());

-- Create a function to manually trigger sync if needed
CREATE OR REPLACE FUNCTION trigger_manual_sync(sync_type text DEFAULT 'all')
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  CASE sync_type
    WHEN 'artists' THEN
      SELECT net.http_post(
        url := 'https://' || current_setting('app.supabase_project_ref') || '.supabase.co/functions/v1/sync-artists',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('type', 'all')
      ) INTO result;
    WHEN 'shows' THEN
      SELECT net.http_post(
        url := 'https://' || current_setting('app.supabase_project_ref') || '.supabase.co/functions/v1/sync-shows',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('type', 'all')
      ) INTO result;
    WHEN 'trending' THEN
      SELECT net.http_post(
        url := 'https://' || current_setting('app.supabase_project_ref') || '.supabase.co/functions/v1/update-trending',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
          'Content-Type', 'application/json'
        )
      ) INTO result;
    ELSE
      result := jsonb_build_object('error', 'Invalid sync type');
  END CASE;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the manual sync function
GRANT EXECUTE ON FUNCTION trigger_manual_sync TO authenticated;

COMMENT ON FUNCTION trigger_manual_sync IS 'Manually trigger sync operations. Valid types: artists, shows, trending, all';