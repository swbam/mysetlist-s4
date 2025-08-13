-- =====================================================================
-- FINAL CLEANUP: Remove ALL Supabase Cron Jobs
-- All cron jobs are now handled by Vercel for better code reuse
-- =====================================================================

-- Drop ALL existing cron jobs from Supabase
DO $$
DECLARE
  job_record RECORD;
BEGIN
  RAISE NOTICE 'Removing all Supabase cron jobs...';
  
  -- Remove ALL cron jobs
  FOR job_record IN SELECT jobname FROM cron.job
  LOOP
    RAISE NOTICE 'Removing cron job: %', job_record.jobname;
    PERFORM cron.unschedule(job_record.jobname);
  END LOOP;
  
  RAISE NOTICE 'All cron jobs removed from Supabase.';
END $$;

-- Drop functions that trigger API calls (no longer needed)
DROP FUNCTION IF EXISTS trigger_master_sync_api CASCADE;
DROP FUNCTION IF EXISTS trigger_trending_update_api CASCADE;
DROP FUNCTION IF EXISTS trigger_artist_sync_api CASCADE;
DROP FUNCTION IF EXISTS trigger_finish_mysetlist_sync_api CASCADE;
DROP FUNCTION IF EXISTS trigger_all_syncs CASCADE;
DROP FUNCTION IF EXISTS trigger_sync_job CASCADE;
DROP FUNCTION IF EXISTS trigger_manual_sync CASCADE;

-- Drop old sync-related functions
DROP FUNCTION IF EXISTS refresh_trending_data CASCADE;
DROP FUNCTION IF EXISTS update_artist_trending_scores CASCADE;
DROP FUNCTION IF EXISTS update_show_trending_scores CASCADE;
DROP FUNCTION IF EXISTS recalculate_all_trending_scores CASCADE;
DROP FUNCTION IF EXISTS calculate_show_trending_score CASCADE;
DROP FUNCTION IF EXISTS upsert_sync_job CASCADE;

-- Keep only essential database functions (no cron scheduling)
-- These can still be called directly if needed for maintenance

-- Simple function to get current trending artists (read-only)
CREATE OR REPLACE FUNCTION get_trending_artists(limit_count integer DEFAULT 100)
RETURNS TABLE(
  artist_id uuid,
  artist_name text,
  trending_score numeric,
  last_updated timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as artist_id,
    a.name as artist_name,
    COALESCE(ast.trending_score, 0) as trending_score,
    ast.trending_score_updated_at as last_updated
  FROM artists a
  LEFT JOIN artist_stats ast ON a.id = ast.artist_id
  WHERE a.verified = true
  ORDER BY COALESCE(ast.trending_score, 0) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Simple function to get trending shows (read-only)
CREATE OR REPLACE FUNCTION get_trending_shows(limit_count integer DEFAULT 100)
RETURNS TABLE(
  show_id uuid,
  show_name text,
  show_date date,
  venue_name text,
  trending_score numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as show_id,
    s.name as show_name,
    s.date as show_date,
    v.name as venue_name,
    COALESCE(s.trending_score, 0) as trending_score
  FROM shows s
  LEFT JOIN venues v ON s.venue_id = v.id
  WHERE s.date >= CURRENT_DATE
  AND s.date <= CURRENT_DATE + INTERVAL '180 days'
  ORDER BY COALESCE(s.trending_score, 0) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant read permissions
GRANT EXECUTE ON FUNCTION get_trending_artists TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_trending_shows TO anon, authenticated;

-- Clean up app_settings table if it exists (no longer needed for cron)
DELETE FROM app_settings WHERE key IN ('app_url', 'cron_secret');

-- Add documentation comment
COMMENT ON SCHEMA public IS 'All cron jobs are now handled by Vercel at the application layer for better code reuse and maintainability. Supabase is used purely as a database.';

-- Final verification
DO $$
DECLARE
  job_count integer;
BEGIN
  SELECT COUNT(*) INTO job_count FROM cron.job;
  
  IF job_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All Supabase cron jobs have been removed.';
    RAISE NOTICE '✅ All cron jobs are now handled by Vercel:';
    RAISE NOTICE '   - /api/cron/update-active-artists (every 6 hours)';
    RAISE NOTICE '   - /api/cron/trending-artist-sync (daily at 2 AM)';
    RAISE NOTICE '   - /api/cron/complete-catalog-sync (weekly Sunday 3 AM)';
    RAISE NOTICE '   - /api/cron/calculate-trending (daily at 1 AM)';
    RAISE NOTICE '   - /api/cron/master-sync (daily at 4 AM)';
    RAISE NOTICE '   - /api/cron/sync-artist-data (every 12 hours)';
    RAISE NOTICE '   - /api/cron/finish-mysetlist-sync (daily at 5 AM)';
  ELSE
    RAISE WARNING '⚠️ WARNING: % cron jobs still exist in Supabase', job_count;
  END IF;
END $$;