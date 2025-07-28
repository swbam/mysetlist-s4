-- Database Security Migration
-- Fixes RLS on 5 tables and security definer view issue
-- Run this migration to resolve all security vulnerabilities

-- Enable RLS on tables missing it
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

-- Drop existing view to recreate without security definer
DROP VIEW IF EXISTS cron_job_status;

-- user_activity_log policies
CREATE POLICY "Users can view their own activity logs"
ON user_activity_log FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all activity logs"
ON user_activity_log FOR ALL
TO service_role
USING (true);

-- trending_artists policies
CREATE POLICY "Anyone can view trending artists"
ON trending_artists FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage trending artists"
ON trending_artists FOR ALL
TO service_role
USING (true);

-- trending_shows policies
CREATE POLICY "Anyone can view trending shows"
ON trending_shows FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage trending shows"
ON trending_shows FOR ALL
TO service_role
USING (true);

-- pipeline_jobs policies
CREATE POLICY "Service role can manage pipeline jobs"
ON pipeline_jobs FOR ALL
TO service_role
USING (true);

CREATE POLICY "Authenticated users can view pipeline jobs"
ON pipeline_jobs FOR SELECT
TO authenticated
USING (true);

-- schema_migrations policies
CREATE POLICY "Service role can manage schema migrations"
ON schema_migrations FOR ALL
TO service_role
USING (true);

CREATE POLICY "Authenticated users can view schema migrations"
ON schema_migrations FOR SELECT
TO authenticated
USING (true);

-- Recreate cron_job_status view without security definer
CREATE OR REPLACE VIEW cron_job_status AS
SELECT
    j.jobid,
    j.jobname,
    j.schedule,
    j.active,
    j.command,
    (
        SELECT jsonb_build_object(
            'last_run', r.runid,
            'started_at', r.job_start,
            'finished_at', r.job_finish,
            'status', r.status,
            'return_message', r.return_message
        )
        FROM cron.job_run_details r
        WHERE r.jobid = j.jobid
        ORDER BY r.runid DESC
        LIMIT 1
    ) as last_run,
    (
        SELECT count(*)::int
        FROM cron.job_run_details r
        WHERE r.jobid = j.jobid
        AND r.status = 'succeeded'
    ) as successful_runs,
    (
        SELECT count(*)::int
        FROM cron.job_run_details r
        WHERE r.jobid = j.jobid
        AND r.status = 'failed'
    ) as failed_runs
FROM cron.job j
WHERE j.username = current_user;

-- Grant permissions on the view
GRANT SELECT ON cron_job_status TO anon, authenticated, service_role;

-- Verification queries to confirm security is properly configured
DO $$
BEGIN
    RAISE NOTICE 'Security migration completed. Run the following queries to verify:';
    RAISE NOTICE '1. Check RLS status: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = ''public'' AND tablename IN (''user_activity_log'', ''trending_artists'', ''trending_shows'', ''pipeline_jobs'', ''schema_migrations'');';
    RAISE NOTICE '2. Check policies: SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = ''public'' AND tablename IN (''user_activity_log'', ''trending_artists'', ''trending_shows'', ''pipeline_jobs'', ''schema_migrations'');';
    RAISE NOTICE '3. Check view definition: SELECT definition FROM pg_views WHERE viewname = ''cron_job_status'';';
END $$;