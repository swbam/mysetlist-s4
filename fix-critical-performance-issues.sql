-- Critical Performance Issues Fix Script
-- Addresses issues identified during comprehensive performance testing

-- 1. Fix missing 'percentage' column in import_status table
-- This column is referenced in the codebase but missing from schema
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'import_status' 
        AND column_name = 'percentage'
    ) THEN
        ALTER TABLE import_status ADD COLUMN percentage INTEGER DEFAULT 0;
        COMMENT ON COLUMN import_status.percentage IS 'Import completion percentage (0-100)';
    END IF;
END $$;

-- 2. Ensure import_status table has all required columns for performance
DO $$ 
BEGIN
    -- Add progress_details if missing (for SSE progress tracking)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'import_status' 
        AND column_name = 'progress_details'
    ) THEN
        ALTER TABLE import_status ADD COLUMN progress_details JSONB DEFAULT '{}';
        COMMENT ON COLUMN import_status.progress_details IS 'Detailed progress information for SSE streaming';
    END IF;

    -- Add last_updated_at if missing (for cache invalidation)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'import_status' 
        AND column_name = 'last_updated_at'
    ) THEN
        ALTER TABLE import_status ADD COLUMN last_updated_at TIMESTAMPTZ DEFAULT NOW();
        COMMENT ON COLUMN import_status.last_updated_at IS 'Timestamp for cache invalidation and progress tracking';
    END IF;
END $$;

-- 3. Optimize import_status table for performance
-- Add indexes for frequent queries during import monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_import_status_job_id 
ON import_status(job_id) WHERE status = 'in_progress';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_import_status_updated_recent 
ON import_status(last_updated_at DESC) WHERE last_updated_at > NOW() - INTERVAL '1 hour';

-- 4. Add performance monitoring for import operations
CREATE OR REPLACE FUNCTION update_import_progress(
    p_job_id TEXT,
    p_percentage INTEGER,
    p_status TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE import_status 
    SET 
        percentage = p_percentage,
        status = COALESCE(p_status, status),
        progress_details = COALESCE(p_details, progress_details),
        last_updated_at = NOW()
    WHERE job_id = p_job_id;
    
    -- If no row was updated, insert a new one
    IF NOT FOUND THEN
        INSERT INTO import_status (job_id, percentage, status, progress_details, last_updated_at)
        VALUES (p_job_id, p_percentage, COALESCE(p_status, 'in_progress'), COALESCE(p_details, '{}'), NOW());
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Optimize SSE progress queries with specialized function
CREATE OR REPLACE FUNCTION get_import_progress(p_job_id TEXT)
RETURNS TABLE(
    job_id TEXT,
    percentage INTEGER,
    status TEXT,
    progress_details JSONB,
    last_updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.job_id,
        i.percentage,
        i.status,
        i.progress_details,
        i.last_updated_at
    FROM import_status i
    WHERE i.job_id = p_job_id
    AND i.last_updated_at > NOW() - INTERVAL '24 hours'; -- Only recent imports
END;
$$ LANGUAGE plpgsql;

-- 6. Performance monitoring views for debugging
CREATE OR REPLACE VIEW import_performance_stats AS
SELECT 
    status,
    COUNT(*) as count,
    AVG(percentage) as avg_percentage,
    MIN(last_updated_at) as oldest_update,
    MAX(last_updated_at) as newest_update
FROM import_status 
WHERE last_updated_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- 7. Cleanup old import status records for performance
CREATE OR REPLACE FUNCTION cleanup_old_import_status()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete import status records older than 7 days
    DELETE FROM import_status 
    WHERE last_updated_at < NOW() - INTERVAL '7 days'
    AND status IN ('completed', 'failed');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Grant necessary permissions for the application
DO $$ 
BEGIN
    -- Grant permissions to the application user (typically 'anon' or 'authenticated')
    GRANT SELECT, INSERT, UPDATE ON import_status TO anon;
    GRANT SELECT, INSERT, UPDATE ON import_status TO authenticated;
    GRANT EXECUTE ON FUNCTION update_import_progress(TEXT, INTEGER, TEXT, JSONB) TO anon;
    GRANT EXECUTE ON FUNCTION update_import_progress(TEXT, INTEGER, TEXT, JSONB) TO authenticated;
    GRANT EXECUTE ON FUNCTION get_import_progress(TEXT) TO anon;
    GRANT EXECUTE ON FUNCTION get_import_progress(TEXT) TO authenticated;
EXCEPTION 
    WHEN insufficient_privilege THEN
        -- Permissions might already exist or be handled differently
        NULL;
END $$;

-- 9. Refresh materialized views for performance
REFRESH MATERIALIZED VIEW CONCURRENTLY artist_performance_cache;
REFRESH MATERIALIZED VIEW CONCURRENTLY show_performance_cache;

-- 10. Update table statistics for query planner
ANALYZE import_status;
ANALYZE artists;
ANALYZE songs;
ANALYZE shows;

-- Performance Verification Queries
-- Run these to verify the fixes are working

-- Check import_status table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'import_status'
ORDER BY ordinal_position;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'import_status'
ORDER BY idx_scan DESC;

-- Check recent import performance
SELECT * FROM import_performance_stats;

COMMENT ON SCRIPT IS 'Critical performance fixes for import status tracking and SSE performance optimization';