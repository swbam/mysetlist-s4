-- ============================================================================
-- DATABASE SECURITY VALIDATION SCRIPT
-- ============================================================================
-- Run this script to validate that all security fixes have been applied correctly
-- This script should be run by an admin user to verify the security configuration

-- ============================================================================
-- VALIDATION 1: CHECK RLS STATUS ON ALL TABLES
-- ============================================================================

SELECT 
    '=== RLS STATUS AUDIT ===' as section_header;

SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✓ ENABLED'
        ELSE '✗ DISABLED'
    END as rls_status,
    CASE 
        WHEN tablename IN ('user_activity_log', 'pipeline_jobs', 'schema_migrations') 
        THEN '⚠ CRITICAL TABLE'
        ELSE 'Standard table'
    END as importance
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT LIKE 'pg_%' 
AND tablename NOT LIKE '_prisma_%'
ORDER BY 
    CASE WHEN tablename IN ('user_activity_log', 'pipeline_jobs', 'schema_migrations') THEN 1 ELSE 2 END,
    tablename;

-- ============================================================================
-- VALIDATION 2: CHECK POLICY COVERAGE
-- ============================================================================

SELECT 
    '=== POLICY COVERAGE AUDIT ===' as section_header;

SELECT 
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count,
    CASE 
        WHEN NOT t.rowsecurity THEN 'No RLS'
        WHEN COUNT(p.policyname) = 0 THEN '⚠ NO POLICIES'
        WHEN COUNT(p.policyname) > 0 THEN '✓ HAS POLICIES'
    END as status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
AND t.tablename NOT LIKE 'pg_%'
AND t.tablename NOT LIKE '_prisma_%'
GROUP BY t.tablename, t.rowsecurity
ORDER BY 
    CASE WHEN COUNT(p.policyname) = 0 AND t.rowsecurity THEN 1 ELSE 2 END,
    t.tablename;

-- ============================================================================
-- VALIDATION 3: CHECK SPECIFIC CRITICAL TABLE POLICIES
-- ============================================================================

SELECT 
    '=== CRITICAL TABLE POLICIES ===' as section_header;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd as command_type,
    CASE 
        WHEN roles = '{authenticated}' THEN '✓ Authenticated users'
        WHEN roles = '{anon}' THEN '⚠ Anonymous users'
        ELSE array_to_string(roles, ', ')
    END as applies_to
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_activity_log', 'pipeline_jobs', 'schema_migrations')
ORDER BY tablename, policyname;

-- ============================================================================
-- VALIDATION 4: CHECK SECURITY DEFINER FUNCTIONS
-- ============================================================================

SELECT 
    '=== SECURITY DEFINER FUNCTIONS ===' as section_header;

SELECT 
    proname as function_name,
    prosecdef as is_security_definer,
    proacl as permissions,
    CASE 
        WHEN prosecdef THEN '✓ SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN (
    'admin_dashboard_stats',
    'get_trending_artists', 
    'get_trending_shows',
    'audit_rls_status',
    'detect_policy_bypasses',
    'generate_security_report'
)
ORDER BY proname;

-- ============================================================================
-- VALIDATION 5: CHECK CRON JOB STATUS VIEW
-- ============================================================================

SELECT 
    '=== CRON JOB STATUS VIEW ===' as section_header;

-- Check if view exists and has proper security
SELECT 
    viewname,
    definition,
    CASE 
        WHEN definition LIKE '%security_invoker%' THEN '✓ SECURE (security_invoker)'
        WHEN definition LIKE '%security_definer%' THEN '⚠ SECURITY DEFINER'
        ELSE 'Check manually'
    END as security_status
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'cron_job_status';

-- ============================================================================
-- VALIDATION 6: TEST SECURITY FUNCTIONS (ADMIN ONLY)
-- ============================================================================

SELECT 
    '=== TESTING SECURITY FUNCTIONS ===' as section_header;

-- Test the audit function
SELECT 'Testing audit_rls_status function...' as test_status;
SELECT * FROM audit_rls_status() LIMIT 5;

-- Test trending data functions
SELECT 'Testing get_trending_artists function...' as test_status;
SELECT COUNT(*) as trending_artists_count FROM get_trending_artists(5);

SELECT 'Testing get_trending_shows function...' as test_status;
SELECT COUNT(*) as trending_shows_count FROM get_trending_shows(5);

-- ============================================================================
-- VALIDATION 7: GENERATE SECURITY REPORT
-- ============================================================================

SELECT 
    '=== COMPREHENSIVE SECURITY REPORT ===' as section_header;

SELECT generate_security_report() as security_report;

-- ============================================================================
-- VALIDATION 8: CHECK SERVICE ROLE PERMISSIONS
-- ============================================================================

SELECT 
    '=== SERVICE ROLE PERMISSIONS ===' as section_header;

-- Check that service role has necessary table permissions
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.table_privileges 
WHERE grantee = 'service_role'
AND table_schema = 'public'
AND table_name IN ('user_activity_log', 'pipeline_jobs', 'schema_migrations', 'artists', 'shows')
ORDER BY table_name, privilege_type;

-- ============================================================================
-- VALIDATION 9: CHECK FOR SECURITY ISSUES
-- ============================================================================

SELECT 
    '=== SECURITY ISSUES DETECTED ===' as section_header;

SELECT * FROM detect_policy_bypasses();

-- ============================================================================
-- VALIDATION 10: FINAL SUMMARY
-- ============================================================================

SELECT 
    '=== SECURITY VALIDATION SUMMARY ===' as section_header;

WITH security_summary AS (
    SELECT 
        COUNT(*) as total_tables,
        COUNT(*) FILTER (WHERE rowsecurity = true) as rls_enabled_tables,
        COUNT(*) FILTER (WHERE rowsecurity = false) as rls_disabled_tables
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%' 
    AND tablename NOT LIKE '_prisma_%'
),
policy_summary AS (
    SELECT COUNT(*) as total_policies
    FROM pg_policies 
    WHERE schemaname = 'public'
),
critical_tables AS (
    SELECT 
        COUNT(*) as critical_tables_total,
        COUNT(*) FILTER (WHERE rowsecurity = true) as critical_tables_secured
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('user_activity_log', 'pipeline_jobs', 'schema_migrations')
)
SELECT 
    s.total_tables,
    s.rls_enabled_tables,
    s.rls_disabled_tables,
    ROUND((s.rls_enabled_tables::numeric / s.total_tables::numeric) * 100, 1) as rls_coverage_percent,
    p.total_policies,
    c.critical_tables_total,
    c.critical_tables_secured,
    CASE 
        WHEN c.critical_tables_secured = c.critical_tables_total THEN '✓ ALL CRITICAL TABLES SECURED'
        ELSE '⚠ CRITICAL TABLES NOT FULLY SECURED'
    END as critical_table_status,
    CASE 
        WHEN s.rls_enabled_tables::numeric / s.total_tables::numeric >= 0.8 THEN '✓ GOOD RLS COVERAGE'
        ELSE '⚠ IMPROVE RLS COVERAGE'
    END as overall_security_status
FROM security_summary s, policy_summary p, critical_tables c;

-- ============================================================================
-- MANUAL VERIFICATION STEPS
-- ============================================================================

SELECT 
    '=== MANUAL VERIFICATION REQUIRED ===' as section_header;

SELECT 
    'Please manually verify:' as instructions
UNION ALL
SELECT '1. Admin dashboard stats function requires admin role'
UNION ALL  
SELECT '2. Cron job status view only shows data to admins'
UNION ALL
SELECT '3. Service role can perform sync operations'
UNION ALL
SELECT '4. User activity logs are privacy-protected'
UNION ALL
SELECT '5. Pipeline jobs are admin-only accessible'
UNION ALL
SELECT '6. Schema migrations are properly controlled';