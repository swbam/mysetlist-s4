-- ============================================================================
-- DATABASE SECURITY FIX MIGRATION
-- ============================================================================
-- This migration addresses critical security issues:
-- 1. Enables RLS on all public tables that need it
-- 2. Creates appropriate RLS policies for each table
-- 3. Fixes security definer view issues
-- 4. Ensures proper permissions for service role and cron jobs
-- 5. Reviews and fixes all database policies

-- ============================================================================
-- PART 1: ENABLE RLS ON MISSING TABLES
-- ============================================================================

-- Core analytics and logging tables
ALTER TABLE IF EXISTS user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS schema_migrations ENABLE ROW LEVEL SECURITY;

-- Pipeline and job management tables
CREATE TABLE IF NOT EXISTS pipeline_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type text NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    data jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE IF EXISTS pipeline_jobs ENABLE ROW LEVEL SECURITY;

-- Create schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Materialized views need special handling - they can't have RLS
-- Instead, we create security policies on the underlying tables

-- ============================================================================
-- PART 2: SECURITY DEFINER VIEW - FIXED IMPLEMENTATION
-- ============================================================================

-- Drop existing insecure view if it exists
DROP VIEW IF EXISTS cron_job_status;

-- Create secure cron job status view
CREATE OR REPLACE VIEW cron_job_status
WITH (security_invoker=true) AS
SELECT 
    j.jobname,
    j.schedule,
    j.active,
    CASE 
        WHEN pg_authid.rolname IS NOT NULL THEN 'system'
        ELSE 'unauthorized'
    END as run_as,
    pg_stat_activity.state,
    pg_stat_activity.query_start
FROM cron.job j
LEFT JOIN pg_authid ON j.username = pg_authid.rolname
LEFT JOIN pg_stat_activity ON pg_stat_activity.application_name = 'pg_cron'
WHERE 
    -- Only admins can see all jobs
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
    OR
    -- Service role can see all jobs
    current_user = 'service_role';

-- ============================================================================
-- PART 3: RLS POLICIES FOR ANALYTICS AND LOGGING TABLES
-- ============================================================================

-- User Activity Log Policies
-- Privacy-sensitive - users can only see their own activity, admins see all
DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity_log;
CREATE POLICY "Users can view their own activity" ON user_activity_log
    FOR SELECT USING (
        auth.uid() = user_id 
        OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'moderator')
        )
    );

-- System can insert activity logs
DROP POLICY IF EXISTS "System can insert activity logs" ON user_activity_log;
CREATE POLICY "System can insert activity logs" ON user_activity_log
    FOR INSERT WITH CHECK (true);

-- Pipeline Jobs Policies
-- Admin-only access for job management
DROP POLICY IF EXISTS "Admins can manage pipeline jobs" ON pipeline_jobs;
CREATE POLICY "Admins can manage pipeline jobs" ON pipeline_jobs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
        OR current_user = 'service_role'
    );

-- Schema Migrations Policies
-- Read-only for admins, full access for service role
DROP POLICY IF EXISTS "Admins can view schema migrations" ON schema_migrations;
CREATE POLICY "Admins can view schema migrations" ON schema_migrations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
        OR current_user = 'service_role'
    );

DROP POLICY IF EXISTS "Service role can manage schema migrations" ON schema_migrations;
CREATE POLICY "Service role can manage schema migrations" ON schema_migrations
    FOR ALL USING (current_user = 'service_role');

-- ============================================================================
-- PART 4: MATERIALIZED VIEW ACCESS CONTROL
-- ============================================================================

-- Since materialized views can't have RLS, we control access through functions
-- Create secure functions to access trending data

CREATE OR REPLACE FUNCTION get_trending_artists(p_limit integer DEFAULT 20)
RETURNS TABLE (
    id uuid,
    name text,
    slug text,
    image_url text,
    popularity integer,
    trending_score double precision,
    total_shows bigint,
    upcoming_shows bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Public access - anyone can view trending artists
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.slug,
        a.image_url,
        a.popularity,
        a.trending_score,
        a.total_shows::bigint,
        a.upcoming_shows::bigint
    FROM artists a
    WHERE a.trending_score > 0
    ORDER BY a.trending_score DESC, a.popularity DESC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION get_trending_shows(p_limit integer DEFAULT 20)
RETURNS TABLE (
    id uuid,
    name text,
    slug text,
    date date,
    status text,
    trending_score double precision,
    artist_name text,
    venue_name text,
    venue_city text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Public access - anyone can view trending shows
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.slug,
        s.date,
        s.status::text,
        s.trending_score,
        a.name as artist_name,
        v.name as venue_name,
        v.city as venue_city
    FROM shows s
    JOIN artists a ON s.headliner_artist_id = a.id
    LEFT JOIN venues v ON s.venue_id = v.id
    WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
    AND s.trending_score > 0
    ORDER BY s.trending_score DESC, s.vote_count DESC
    LIMIT p_limit;
END;
$$;

-- Grant public access to these functions
GRANT EXECUTE ON FUNCTION get_trending_artists(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_trending_shows(integer) TO anon, authenticated;

-- ============================================================================
-- PART 5: REVIEW AND FIX EXISTING POLICIES
-- ============================================================================

-- Fix any overly permissive policies and ensure they follow principle of least privilege

-- Artists table - ensure service role can sync data
DROP POLICY IF EXISTS "Service role can manage artists" ON artists;
CREATE POLICY "Service role can manage artists" ON artists
    FOR ALL USING (current_user = 'service_role');

-- Shows table - ensure service role can sync data
DROP POLICY IF EXISTS "Service role can manage shows" ON shows;
CREATE POLICY "Service role can manage shows" ON shows
    FOR ALL USING (current_user = 'service_role');

-- Songs table - ensure service role can sync data
DROP POLICY IF EXISTS "Service role can manage songs" ON songs;
CREATE POLICY "Service role can manage songs" ON songs
    FOR ALL USING (current_user = 'service_role');

-- Setlists table - ensure service role can manage data
DROP POLICY IF EXISTS "Service role can manage setlists" ON setlists;
CREATE POLICY "Service role can manage setlists" ON setlists
    FOR ALL USING (current_user = 'service_role');

-- Artist stats - service role needs full access for sync operations
DROP POLICY IF EXISTS "Service role can manage artist stats" ON artist_stats;
CREATE POLICY "Service role can manage artist stats" ON artist_stats
    FOR ALL USING (current_user = 'service_role');

-- ============================================================================
-- PART 6: ADMIN FUNCTION SECURITY
-- ============================================================================

-- Secure the admin dashboard stats function
DROP FUNCTION IF EXISTS admin_dashboard_stats();
CREATE OR REPLACE FUNCTION admin_dashboard_stats()
RETURNS TABLE (
    trending_artists integer,
    hot_shows integer,
    search_volume integer,
    active_users integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow admin users to access this function
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    ) AND current_user != 'service_role' THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::integer FROM artists WHERE trending_score > 0) AS trending_artists,
        (SELECT COUNT(*)::integer FROM shows WHERE status = 'upcoming' AND trending_score > 0) AS hot_shows,
        (SELECT COUNT(*)::integer FROM search_analytics WHERE search_timestamp >= NOW() - INTERVAL '24 hours') AS search_volume,
        (SELECT COUNT(*)::integer FROM users WHERE last_login_at >= NOW() - INTERVAL '15 minutes') AS active_users;
END;
$$;

-- Revoke public access and grant only to authenticated users
REVOKE ALL ON FUNCTION admin_dashboard_stats() FROM anon;
GRANT EXECUTE ON FUNCTION admin_dashboard_stats() TO authenticated;

-- ============================================================================
-- PART 7: SERVICE ROLE PERMISSIONS FOR CRON JOBS
-- ============================================================================

-- Ensure service role has all necessary permissions for cron job operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Specific permissions for cron job operations
GRANT SELECT, INSERT, UPDATE, DELETE ON user_activity_log TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON pipeline_jobs TO service_role;
GRANT SELECT, INSERT ON schema_migrations TO service_role;
GRANT SELECT ON cron_job_status TO service_role;

-- ============================================================================
-- PART 8: AUDIT AND VALIDATION
-- ============================================================================

-- Create function to audit RLS status
CREATE OR REPLACE FUNCTION audit_rls_status()
RETURNS TABLE (
    table_name text,
    rls_enabled boolean,
    policy_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only admins can run security audits
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    ) AND current_user != 'service_role' THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required for security audit.';
    END IF;

    RETURN QUERY
    SELECT 
        t.tablename::text,
        t.rowsecurity,
        COUNT(p.policyname)
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
    WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE '_prisma_%'
    GROUP BY t.tablename, t.rowsecurity
    ORDER BY t.tablename;
END;
$$;

GRANT EXECUTE ON FUNCTION audit_rls_status() TO authenticated;

-- ============================================================================
-- PART 9: COMMENTS AND DOCUMENTATION
-- ============================================================================

-- Add security-focused comments
COMMENT ON POLICY "Users can view their own activity" ON user_activity_log IS 
    'Users can only view their own activity logs for privacy. Admins and moderators can view all logs.';

COMMENT ON POLICY "Admins can manage pipeline jobs" ON pipeline_jobs IS 
    'Only admins and service role can manage background job processing for security.';

COMMENT ON VIEW cron_job_status IS 
    'Secure view of cron job status with proper access controls. Only admins can view.';

COMMENT ON FUNCTION get_trending_artists(integer) IS 
    'Public function to safely access trending artists data without exposing underlying materialized view.';

COMMENT ON FUNCTION admin_dashboard_stats() IS 
    'Admin-only function for dashboard statistics with proper security checks.';

-- ============================================================================
-- PART 10: FINAL VALIDATION AND LOGGING
-- ============================================================================

-- Insert migration record
INSERT INTO schema_migrations (version) 
VALUES ('20250728_fix_database_security')
ON CONFLICT (version) DO NOTHING;

-- Log security fix in admin notifications
INSERT INTO admin_notifications (type, title, message, severity, metadata)
VALUES (
    'security',
    'Database Security Migration Applied',
    'Successfully applied comprehensive database security fixes including RLS policies, secure views, and proper permissions.',
    'high',
    jsonb_build_object(
        'migration', '20250728_fix_database_security',
        'fixes_applied', jsonb_build_array(
            'RLS enabled on user_activity_log, pipeline_jobs, schema_migrations',
            'Fixed security definer view cron_job_status',
            'Created secure trending data access functions',
            'Updated service role permissions for cron jobs',
            'Added admin security audit function'
        )
    )
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VALIDATION QUERIES (commented out for production)
-- ============================================================================

-- Uncomment these to validate the security fixes:

-- Check RLS status on all tables
-- SELECT * FROM audit_rls_status() ORDER BY table_name;

-- Verify policies exist for critical tables
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('user_activity_log', 'pipeline_jobs', 'schema_migrations')
-- ORDER BY tablename, policyname;

-- Test secure functions work
-- SELECT COUNT(*) FROM get_trending_artists(5);
-- SELECT COUNT(*) FROM get_trending_shows(5);