-- Clean up all duplicate cron jobs for MySetlist

-- First, list all current cron jobs for visibility
DO $$
BEGIN
    RAISE NOTICE 'Current cron jobs before cleanup:';
    FOR r IN SELECT jobid, jobname FROM cron.job
    LOOP
        RAISE NOTICE 'Job ID: %, Name: %', r.jobid, r.jobname;
    END LOOP;
END $$;

-- Unschedule all duplicate and outdated cron jobs
DO $$
DECLARE
    job_record RECORD;
BEGIN
    -- Loop through all jobs and unschedule duplicates/old ones
    FOR job_record IN 
        SELECT jobname 
        FROM cron.job 
        WHERE jobname IN (
            'scheduled-sync-daily',
            'update-trending-scores',
            'daily-sync',
            'hourly-trending-update',
            'mysetlist-sync-artists-daily',
            'mysetlist-sync-concerts-hourly',
            'mysetlist-sync-setlists-daily',
            'spotify-catalog-sync',
            'ticketmaster-shows-sync',
            'user-artists-sync',
            'hourly-scheduled-sync'
        )
    LOOP
        BEGIN
            PERFORM cron.unschedule(job_record.jobname);
            RAISE NOTICE 'Unscheduled: %', job_record.jobname;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not unschedule %: %', job_record.jobname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Keep only essential cron jobs for MySetlist

-- 1. Main sync job - runs every 6 hours for artist sync
SELECT cron.schedule(
    'mysetlist-main-sync',
    '0 */6 * * *',
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url')::text || '/functions/v1/scheduled-sync',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')::text
        ),
        body := jsonb_build_object('type', 'all', 'limit', 50)
    );
    $$
);

-- 2. Trending update - runs every 2 hours
SELECT cron.schedule(
    'mysetlist-trending-scores',
    '0 */2 * * *',
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url')::text || '/functions/v1/update-trending',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')::text
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 3. Keep maintenance jobs (these are fine)
-- cleanup-old-analytics - daily at 2 AM
-- update-artist-stats - weekly on Sunday at 3 AM
-- vote-aggregation-cleanup - hourly
-- daily-data-cleanup - daily at 1 AM
-- sync-job-monitoring - every 15 minutes

-- 4. Keep email jobs if they're properly configured
-- weekly-email-digest - weekly on Sunday at 9 AM
-- daily-reminders - daily at 10 AM
-- process-email-queue - every 5 minutes

-- Log the final state
DO $$
BEGIN
    RAISE NOTICE 'Cron jobs after cleanup:';
    FOR r IN SELECT jobid, jobname, schedule FROM cron.job ORDER BY jobname
    LOOP
        RAISE NOTICE 'Job: % (ID: %) - Schedule: %', r.jobname, r.jobid, r.schedule;
    END LOOP;
END $$;

-- Insert cleanup log
INSERT INTO public.cron_job_logs (job_name, status, message, created_at)
VALUES 
    ('cron-cleanup', 'completed', 'Cleaned up duplicate cron jobs and established proper sync schedule', NOW());