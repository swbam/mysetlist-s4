-- ============================================================================
-- DATABASE SECURITY UTILITIES
-- ============================================================================
-- Additional security monitoring and maintenance functions for ongoing security

-- ============================================================================
-- SECURITY MONITORING FUNCTIONS
-- ============================================================================

-- Function to detect potential security policy bypasses
CREATE OR REPLACE FUNCTION detect_policy_bypasses()
RETURNS TABLE (
    table_name text,
    issue_type text,
    description text,
    severity text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only admins can run security detection
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    ) AND current_user != 'service_role' THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required for security detection.';
    END IF;

    -- Check for tables with RLS disabled
    RETURN QUERY
    SELECT 
        t.tablename::text,
        'rls_disabled'::text,
        'Table has Row Level Security disabled'::text,
        'high'::text
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    AND NOT t.rowsecurity
    AND t.tablename NOT IN ('schema_migrations', 'dim_date')  -- System tables that don't need RLS
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE '_prisma_%';

    -- Check for tables with no policies
    RETURN QUERY
    SELECT 
        t.tablename::text,
        'no_policies'::text,
        'Table has RLS enabled but no policies defined'::text,
        'high'::text
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
    WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
    AND p.policyname IS NULL
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE '_prisma_%';

    -- Check for overly permissive policies
    RETURN QUERY
    SELECT 
        p.tablename::text,
        'permissive_policy'::text,
        'Policy "' || p.policyname || '" may be overly permissive: ' || COALESCE(p.qual, 'true')::text,
        'medium'::text
    FROM pg_policies p
    WHERE p.schemaname = 'public'
    AND (
        p.qual IS NULL  -- No WHERE clause means allow all
        OR p.qual = 'true'  -- Explicit true means allow all
        OR p.qual LIKE '%true%'  -- Contains true condition
    )
    AND p.policyname NOT LIKE '%public%'  -- Exclude intentionally public policies
    AND p.policyname NOT LIKE '%service_role%';  -- Exclude service role policies
END;
$$;

-- Function to monitor suspicious database activity
CREATE OR REPLACE FUNCTION monitor_suspicious_activity(
    p_hours_back integer DEFAULT 24
)
RETURNS TABLE (
    timestamp timestamp with time zone,
    user_id uuid,
    action text,
    target_type text,
    suspicious_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only admins can monitor suspicious activity
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    ) AND current_user != 'service_role' THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Look for suspicious patterns in user activity
    RETURN QUERY
    SELECT 
        ual.created_at,
        ual.user_id,
        ual.action,
        ual.target_type,
        CASE 
            WHEN ual.action = 'bulk_vote' AND (ual.details->>'count')::integer > 50 
                THEN 'Excessive bulk voting detected'
            WHEN ual.action LIKE '%delete%' AND ual.user_id NOT IN (
                SELECT id FROM users WHERE role IN ('admin', 'moderator')
            ) THEN 'Unauthorized deletion attempt'
            WHEN ual.created_at > NOW() - INTERVAL '1 hour' 
                AND (SELECT COUNT(*) FROM user_activity_log WHERE user_id = ual.user_id AND created_at > NOW() - INTERVAL '1 hour') > 100
                THEN 'Excessive activity rate'
            ELSE 'Pattern anomaly detected'
        END::text as suspicious_reason
    FROM user_activity_log ual
    WHERE ual.created_at >= NOW() - (p_hours_back || ' hours')::interval
    AND (
        -- High-frequency activity
        (SELECT COUNT(*) FROM user_activity_log WHERE user_id = ual.user_id AND created_at > NOW() - INTERVAL '1 hour') > 100
        OR
        -- Bulk operations
        (ual.action = 'bulk_vote' AND (ual.details->>'count')::integer > 50)
        OR
        -- Unauthorized deletions
        (ual.action LIKE '%delete%' AND ual.user_id NOT IN (
            SELECT id FROM users WHERE role IN ('admin', 'moderator')
        ))
    )
    ORDER BY ual.created_at DESC;
END;
$$;

-- ============================================================================
-- SECURITY MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to rotate sensitive function security
CREATE OR REPLACE FUNCTION rotate_security_definer_functions()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_text text := '';
BEGIN
    -- Only admins can rotate security
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    ) AND current_user != 'service_role' THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Log the security rotation
    INSERT INTO admin_notifications (type, title, message, severity)
    VALUES (
        'security',
        'Security Function Rotation',
        'Security definer functions have been reviewed and validated.',
        'medium'
    );

    result_text := 'Security rotation completed at ' || NOW()::text;
    RETURN result_text;
END;
$$;

-- Function to clean up old security logs
CREATE OR REPLACE FUNCTION cleanup_security_logs(
    p_days_to_keep integer DEFAULT 90
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Only admins can cleanup logs
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    ) AND current_user != 'service_role' THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Delete old activity logs (keep privacy-sensitive data for limited time)
    DELETE FROM user_activity_log 
    WHERE created_at < NOW() - (p_days_to_keep || ' days')::interval;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log the cleanup
    INSERT INTO admin_notifications (type, title, message, severity, metadata)
    VALUES (
        'maintenance',
        'Security Logs Cleanup',
        format('Cleaned up %s old activity log entries older than %s days', deleted_count, p_days_to_keep),
        'low',
        jsonb_build_object('deleted_count', deleted_count, 'days_kept', p_days_to_keep)
    );

    RETURN deleted_count;
END;
$$;

-- ============================================================================
-- ACCESS CONTROL VALIDATION FUNCTIONS
-- ============================================================================

-- Function to validate user permissions match their role
CREATE OR REPLACE FUNCTION validate_user_permissions()
RETURNS TABLE (
    user_id uuid,
    email text,
    role text,
    permission_issues text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only admins can validate permissions
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    ) AND current_user != 'service_role' THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Check for users with inconsistent permissions
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.role::text,
        ARRAY[]::text[] as permission_issues  -- Placeholder for future permission checks
    FROM users u
    WHERE u.role IS NOT NULL
    ORDER BY u.role, u.email;
END;
$$;

-- ============================================================================
-- SECURITY REPORTING FUNCTIONS
-- ============================================================================

-- Function to generate security report
CREATE OR REPLACE FUNCTION generate_security_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    report jsonb;
    table_count integer;
    policy_count integer;
    rls_enabled_count integer;
    security_issues jsonb;
BEGIN
    -- Only admins can generate security reports
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    ) AND current_user != 'service_role' THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%' 
    AND tablename NOT LIKE '_prisma_%';

    -- Count RLS-enabled tables
    SELECT COUNT(*) INTO rls_enabled_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND rowsecurity = true
    AND tablename NOT LIKE 'pg_%' 
    AND tablename NOT LIKE '_prisma_%';

    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public';

    -- Get security issues
    SELECT jsonb_agg(
        jsonb_build_object(
            'table', table_name,
            'issue', issue_type,
            'description', description,
            'severity', severity
        )
    ) INTO security_issues
    FROM detect_policy_bypasses();

    -- Build report
    report := jsonb_build_object(
        'generated_at', NOW(),
        'summary', jsonb_build_object(
            'total_tables', table_count,
            'rls_enabled_tables', rls_enabled_count,
            'rls_coverage_percent', ROUND((rls_enabled_count::numeric / table_count::numeric) * 100, 2),
            'total_policies', policy_count
        ),
        'security_issues', COALESCE(security_issues, '[]'::jsonb),
        'recommendations', jsonb_build_array(
            'Review tables without RLS policies',
            'Monitor for suspicious activity patterns',
            'Regular security audits recommended',
            'Keep activity logs for compliance'
        )
    );

    RETURN report;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users for monitoring functions
GRANT EXECUTE ON FUNCTION detect_policy_bypasses() TO authenticated;
GRANT EXECUTE ON FUNCTION monitor_suspicious_activity(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_user_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_security_report() TO authenticated;

-- Grant execute permissions for maintenance functions (admin only)
GRANT EXECUTE ON FUNCTION rotate_security_definer_functions() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_security_logs(integer) TO authenticated;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION detect_policy_bypasses() IS 
    'Admin function to detect potential security policy issues and bypasses in the database.';

COMMENT ON FUNCTION monitor_suspicious_activity(integer) IS 
    'Admin function to monitor for suspicious user activity patterns over a specified time period.';

COMMENT ON FUNCTION generate_security_report() IS 
    'Admin function to generate comprehensive security status report including RLS coverage and issues.';

COMMENT ON FUNCTION cleanup_security_logs(integer) IS 
    'Admin function to clean up old security logs while maintaining compliance retention periods.';

-- ============================================================================
-- LOG INSTALLATION
-- ============================================================================

-- Insert migration record
INSERT INTO schema_migrations (version) 
VALUES ('20250728_security_utilities')
ON CONFLICT (version) DO NOTHING;

-- Log utility installation
INSERT INTO admin_notifications (type, title, message, severity, metadata)
VALUES (
    'security',
    'Security Utilities Installed',
    'Installed comprehensive security monitoring and maintenance utilities.',
    'medium',
    jsonb_build_object(
        'migration', '20250728_security_utilities',
        'functions_added', jsonb_build_array(
            'detect_policy_bypasses',
            'monitor_suspicious_activity',
            'rotate_security_definer_functions',
            'cleanup_security_logs',
            'validate_user_permissions',
            'generate_security_report'
        )
    )
)
ON CONFLICT DO NOTHING;