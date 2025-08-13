-- Migration: Comprehensive Performance Optimization
-- Date: 2025-08-13
-- Description: Adds all missing indexes, optimizes query patterns, and implements performance monitoring
-- This migration addresses the specific performance requirements from TheSet application

-- ================================
-- CRITICAL PERFORMANCE INDEXES
-- ================================

-- Artists table indexes - CRITICAL for import orchestrator and trending queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_artists_ticketmaster_id" ON "artists" ("ticketmaster_id") WHERE ticketmaster_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_artists_spotify_id" ON "artists" ("spotify_id") WHERE spotify_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_artists_slug" ON "artists" ("slug");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_artists_popularity_desc" ON "artists" ("popularity" DESC NULLS LAST);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_artists_trending_score_desc" ON "artists" ("trending_score" DESC NULLS LAST);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_artists_last_synced" ON "artists" ("last_synced_at" NULLS FIRST);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_artists_song_catalog_synced" ON "artists" ("song_catalog_synced_at" NULLS FIRST);

-- Shows table indexes - CRITICAL for show queries and date filtering  
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_shows_date_desc" ON "shows" ("date" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_shows_headliner_artist_id" ON "shows" ("headliner_artist_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_shows_venue_id" ON "shows" ("venue_id") WHERE venue_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_shows_status" ON "shows" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_shows_ticketmaster_id" ON "shows" ("ticketmaster_id") WHERE ticketmaster_id IS NOT NULL;

-- Songs table indexes - CRITICAL for catalog sync and search
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_songs_spotify_id" ON "songs" ("spotify_id") WHERE spotify_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_songs_popularity_desc" ON "songs" ("popularity" DESC NULLS LAST);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_songs_title_artist" ON "songs" ("title", "artist");

-- Venues table indexes - CRITICAL for location-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_venues_ticketmaster_id" ON "venues" ("ticketmaster_id") WHERE ticketmaster_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_venues_city_state" ON "venues" ("city", "state") WHERE state IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_venues_city" ON "venues" ("city");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_venues_slug" ON "venues" ("slug");

-- Votes table indexes - CRITICAL for real-time voting performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_votes_user_id" ON "votes" ("user_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_votes_setlist_song_id" ON "votes" ("setlist_song_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_votes_created_at_desc" ON "votes" ("created_at" DESC);

-- User profiles table indexes - CRITICAL for user queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_profiles_user_id" ON "user_profiles" ("user_id");

-- Artist songs junction table indexes - CRITICAL for song-artist relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_artist_songs_artist_id" ON "artist_songs" ("artist_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_artist_songs_song_id" ON "artist_songs" ("song_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_artist_songs_composite" ON "artist_songs" ("artist_id", "song_id");

-- Setlists table indexes - CRITICAL for setlist queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_setlists_show_id" ON "setlists" ("show_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_setlists_artist_id" ON "setlists" ("artist_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_setlists_type" ON "setlists" ("type");

-- Setlist songs table indexes - CRITICAL for voting and position queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_setlist_songs_setlist_id" ON "setlist_songs" ("setlist_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_setlist_songs_song_id" ON "setlist_songs" ("song_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_setlist_songs_position" ON "setlist_songs" ("setlist_id", "position");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_setlist_songs_upvotes_desc" ON "setlist_songs" ("upvotes" DESC NULLS LAST);

-- User follows artists table indexes - CRITICAL for follow relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_follows_artists_user_id" ON "user_follows_artists" ("user_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_follows_artists_artist_id" ON "user_follows_artists" ("artist_id");

-- ================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ================================

-- Artist import orchestrator optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_artists_import_lookup" ON "artists" ("spotify_id", "last_synced_at", "popularity" DESC) WHERE spotify_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_artists_catalog_sync_needed" ON "artists" ("song_catalog_synced_at" NULLS FIRST, "popularity" DESC) WHERE spotify_id IS NOT NULL;

-- Trending calculations composite indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_shows_trending_calc" ON "shows" ("headliner_artist_id", "date" DESC) WHERE date >= CURRENT_DATE - INTERVAL '30 days';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_votes_trending_calc" ON "votes" ("created_at" DESC, "setlist_song_id") WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

-- Show lookup optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_shows_artist_date_status" ON "shows" ("headliner_artist_id", "date" DESC, "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_shows_upcoming" ON "shows" ("date" ASC, "status") WHERE status = 'upcoming' AND date >= CURRENT_DATE;

-- Vote aggregation optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_votes_setlist_aggregation" ON "votes" ("setlist_song_id", "user_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_setlist_songs_vote_lookup" ON "setlist_songs" ("setlist_id", "upvotes" DESC);

-- ================================
-- PARTIAL INDEXES FOR FILTERED QUERIES
-- ================================

-- Only index verified artists for trending calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_artists_verified_trending" ON "artists" ("trending_score" DESC, "popularity" DESC) WHERE verified = true;

-- Only index active shows for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_shows_active_by_venue" ON "shows" ("venue_id", "date" DESC) WHERE status IN ('upcoming', 'ongoing');

-- Only index recent votes for real-time features
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_votes_recent_realtime" ON "votes" ("setlist_song_id", "created_at" DESC) WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours';

-- Only index songs with Spotify IDs for sync
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_songs_sync_ready" ON "songs" ("artist", "title", "popularity" DESC) WHERE spotify_id IS NOT NULL;

-- ================================
-- TEXT SEARCH INDEXES (GIN)
-- ================================

-- Full-text search for artists (if not already exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_artists_fulltext_search" ON "artists" 
USING gin((name || ' ' || COALESCE(genres::text, '')) gin_trgm_ops);

-- Full-text search for songs
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_songs_fulltext_search" ON "songs" 
USING gin((title || ' ' || artist || ' ' || COALESCE(album, '')) gin_trgm_ops);

-- Full-text search for venues (if not already exists)  
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_venues_fulltext_search" ON "venues" 
USING gin((name || ' ' || city || ' ' || COALESCE(state, '') || ' ' || country) gin_trgm_ops);

-- ================================
-- PERFORMANCE MONITORING VIEWS
-- ================================

-- Create view for index usage statistics
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        WHEN idx_scan < 1000 THEN 'MEDIUM_USAGE'
        ELSE 'HIGH_USAGE'
    END as usage_level
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Create view for table statistics
CREATE OR REPLACE VIEW table_performance_stats AS
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    seq_scan as sequential_scans,
    seq_tup_read as sequential_reads,
    idx_scan as index_scans,
    idx_tup_fetch as index_reads,
    CASE 
        WHEN seq_scan + idx_scan = 0 THEN 0
        ELSE ROUND((idx_scan::numeric / (seq_scan + idx_scan) * 100), 2)
    END as index_usage_pct
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY seq_scan + idx_scan DESC;

-- Create view for slow queries (requires pg_stat_statements extension)
CREATE OR REPLACE VIEW slow_queries_analysis AS
SELECT 
    'query_analysis' as analysis_type,
    'Enable pg_stat_statements extension for detailed query performance analysis' as message,
    'Use: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;' as action_required
WHERE NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
);

-- ================================
-- MATERIALIZED VIEWS FOR CACHING
-- ================================

-- Materialized view for frequently accessed artist data
CREATE MATERIALIZED VIEW IF NOT EXISTS artist_performance_cache AS
SELECT 
    a.id,
    a.name,
    a.slug,
    a.image_url,
    a.popularity,
    a.trending_score,
    a.follower_count,
    a.total_shows,
    a.upcoming_shows,
    -- Precalculated aggregations
    COALESCE(follows.follower_count, 0) as app_followers,
    COALESCE(shows.recent_show_count, 0) as recent_shows,
    COALESCE(votes.recent_votes, 0) as recent_vote_activity,
    CURRENT_TIMESTAMP as cached_at
FROM artists a
LEFT JOIN (
    SELECT 
        artist_id,
        COUNT(*) as follower_count
    FROM user_follows_artists
    GROUP BY artist_id
) follows ON a.id = follows.artist_id
LEFT JOIN (
    SELECT 
        headliner_artist_id,
        COUNT(*) as recent_show_count
    FROM shows
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY headliner_artist_id
) shows ON a.id = shows.headliner_artist_id
LEFT JOIN (
    SELECT 
        s.headliner_artist_id,
        COUNT(v.*) as recent_votes
    FROM votes v
    JOIN setlist_songs ss ON v.setlist_song_id = ss.id
    JOIN setlists sl ON ss.setlist_id = sl.id  
    JOIN shows s ON sl.show_id = s.id
    WHERE v.created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY s.headliner_artist_id
) votes ON a.id = votes.headliner_artist_id
WHERE a.spotify_id IS NOT NULL
ORDER BY a.trending_score DESC NULLS LAST, a.popularity DESC NULLS LAST;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS "idx_artist_performance_cache_id" ON "artist_performance_cache" ("id");
CREATE INDEX IF NOT EXISTS "idx_artist_performance_cache_trending" ON "artist_performance_cache" ("trending_score" DESC NULLS LAST);

-- Materialized view for show performance data
CREATE MATERIALIZED VIEW IF NOT EXISTS show_performance_cache AS
SELECT 
    s.id,
    s.name,
    s.slug,
    s.date,
    s.status,
    s.headliner_artist_id,
    a.name as artist_name,
    a.slug as artist_slug,
    a.image_url as artist_image,
    COALESCE(v.name, 'TBA') as venue_name,
    COALESCE(v.city, '') as venue_city,
    COALESCE(vote_stats.total_votes, 0) as total_votes,
    COALESCE(vote_stats.unique_voters, 0) as unique_voters,
    COALESCE(setlist_stats.total_songs, 0) as total_songs,
    CURRENT_TIMESTAMP as cached_at
FROM shows s
JOIN artists a ON s.headliner_artist_id = a.id
LEFT JOIN venues v ON s.venue_id = v.id
LEFT JOIN (
    SELECT 
        sl.show_id,
        COUNT(vo.*) as total_votes,
        COUNT(DISTINCT vo.user_id) as unique_voters
    FROM setlists sl
    JOIN setlist_songs ss ON sl.id = ss.setlist_id
    JOIN votes vo ON ss.id = vo.setlist_song_id
    GROUP BY sl.show_id
) vote_stats ON s.id = vote_stats.show_id
LEFT JOIN (
    SELECT 
        sl.show_id,
        COUNT(ss.*) as total_songs
    FROM setlists sl
    JOIN setlist_songs ss ON sl.id = ss.setlist_id
    GROUP BY sl.show_id
) setlist_stats ON s.id = setlist_stats.show_id
WHERE s.date >= CURRENT_DATE - INTERVAL '1 year'
ORDER BY s.date DESC;

-- Create unique index on show performance cache
CREATE UNIQUE INDEX IF NOT EXISTS "idx_show_performance_cache_id" ON "show_performance_cache" ("id");
CREATE INDEX IF NOT EXISTS "idx_show_performance_cache_date" ON "show_performance_cache" ("date" DESC);
CREATE INDEX IF NOT EXISTS "idx_show_performance_cache_artist" ON "show_performance_cache" ("headliner_artist_id");

-- ================================
-- PERFORMANCE MONITORING FUNCTIONS
-- ================================

-- Function to refresh performance caches
CREATE OR REPLACE FUNCTION refresh_performance_caches()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Refresh materialized views concurrently
    REFRESH MATERIALIZED VIEW CONCURRENTLY artist_performance_cache;
    REFRESH MATERIALIZED VIEW CONCURRENTLY show_performance_cache;
    
    -- Update table statistics
    ANALYZE artists;
    ANALYZE shows;
    ANALYZE songs;
    ANALYZE votes;
    ANALYZE setlists;
    ANALYZE setlist_songs;
    ANALYZE venues;
    ANALYZE user_follows_artists;
    ANALYZE artist_songs;
    
    -- Log the refresh
    RAISE NOTICE 'Performance caches refreshed at %', NOW();
END;
$$;

-- Function to check query performance
CREATE OR REPLACE FUNCTION analyze_performance_bottlenecks()
RETURNS TABLE (
    table_name text,
    issue_type text,
    description text,
    recommendation text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    -- Check for tables with high sequential scan ratio
    SELECT 
        t.tablename::text,
        'HIGH_SEQ_SCANS'::text,
        'Table has high sequential scan ratio: ' || COALESCE(ROUND((t.seq_scan::numeric / NULLIF(t.seq_scan + t.idx_scan, 0) * 100), 2), 0)::text || '%',
        'Consider adding indexes for frequently queried columns'::text
    FROM pg_stat_user_tables t
    WHERE t.schemaname = 'public'
    AND t.seq_scan > t.idx_scan
    AND t.seq_scan > 1000
    
    UNION ALL
    
    -- Check for unused indexes
    SELECT 
        i.tablename::text,
        'UNUSED_INDEX'::text,
        'Index ' || i.indexname || ' has never been used',
        'Consider dropping this index to reduce maintenance overhead'::text
    FROM pg_stat_user_indexes i
    WHERE i.schemaname = 'public'
    AND i.idx_scan = 0
    
    UNION ALL
    
    -- Check for tables needing vacuum
    SELECT 
        t.tablename::text,
        'VACUUM_NEEDED'::text,
        'Table has high update/delete activity',
        'Run VACUUM ANALYZE on this table regularly'::text
    FROM pg_stat_user_tables t
    WHERE t.schemaname = 'public'
    AND (t.n_tup_upd + t.n_tup_del) > 1000
    AND t.last_vacuum IS NULL;
END;
$$;

-- Function to get cache hit ratios
CREATE OR REPLACE FUNCTION get_cache_performance()
RETURNS TABLE (
    cache_type text,
    hit_ratio numeric,
    status text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    -- Buffer cache hit ratio
    SELECT 
        'buffer_cache'::text,
        ROUND(
            (sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100)::numeric, 
            2
        ),
        CASE 
            WHEN (sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100) >= 95 THEN 'EXCELLENT'
            WHEN (sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100) >= 90 THEN 'GOOD'
            WHEN (sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100) >= 80 THEN 'NEEDS_ATTENTION'
            ELSE 'CRITICAL'
        END::text
    FROM pg_statio_user_tables
    WHERE schemaname = 'public'
    
    UNION ALL
    
    -- Index cache hit ratio  
    SELECT 
        'index_cache'::text,
        ROUND(
            (sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0) * 100)::numeric,
            2
        ),
        CASE 
            WHEN (sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0) * 100) >= 95 THEN 'EXCELLENT'
            WHEN (sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0) * 100) >= 90 THEN 'GOOD'  
            WHEN (sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0) * 100) >= 80 THEN 'NEEDS_ATTENTION'
            ELSE 'CRITICAL'
        END::text
    FROM pg_statio_user_indexes
    WHERE schemaname = 'public';
END;
$$;

-- ================================
-- AUTOMATED MAINTENANCE PROCEDURES
-- ================================

-- Function for automated maintenance
CREATE OR REPLACE FUNCTION run_performance_maintenance()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Refresh performance caches
    PERFORM refresh_performance_caches();
    
    -- Update table statistics
    PERFORM analyze_performance_bottlenecks();
    
    -- Clean up old vote data (keep last 2 years)
    DELETE FROM votes 
    WHERE created_at < CURRENT_DATE - INTERVAL '2 years'
    AND id IN (
        SELECT id 
        FROM votes 
        WHERE created_at < CURRENT_DATE - INTERVAL '2 years'
        LIMIT 1000
    );
    
    -- Log maintenance completion
    RAISE NOTICE 'Performance maintenance completed at %', NOW();
END;
$$;

-- ================================
-- GRANT PERMISSIONS
-- ================================

-- Grant permissions for performance monitoring
GRANT SELECT ON index_usage_stats TO authenticated;
GRANT SELECT ON table_performance_stats TO authenticated;  
GRANT SELECT ON slow_queries_analysis TO authenticated;
GRANT SELECT ON artist_performance_cache TO authenticated, anon;
GRANT SELECT ON show_performance_cache TO authenticated, anon;

GRANT EXECUTE ON FUNCTION refresh_performance_caches() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_performance_bottlenecks() TO authenticated;
GRANT EXECUTE ON FUNCTION get_cache_performance() TO authenticated;

-- ================================
-- QUERY OPTIMIZATION HINTS
-- ================================

-- Add helpful comments for developers
COMMENT ON INDEX idx_artists_import_lookup IS 'Optimizes ArtistImportOrchestrator queries for sync status and popularity';
COMMENT ON INDEX idx_shows_trending_calc IS 'Optimizes trending score calculations for recent show activity';
COMMENT ON INDEX idx_votes_recent_realtime IS 'Optimizes real-time voting queries for active shows';
COMMENT ON MATERIALIZED VIEW artist_performance_cache IS 'Cached artist data for homepage and search - refresh every 15 minutes';
COMMENT ON MATERIALIZED VIEW show_performance_cache IS 'Cached show data with vote statistics - refresh every 5 minutes';

COMMENT ON FUNCTION refresh_performance_caches() IS 'Run every 15 minutes via cron to refresh materialized views and statistics';
COMMENT ON FUNCTION run_performance_maintenance() IS 'Run daily for automated performance maintenance and cleanup';

-- ================================
-- COMPLETION LOGGING
-- ================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'COMPREHENSIVE PERFORMANCE OPTIMIZATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Added % indexes for critical query paths', (
        SELECT COUNT(*) 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname LIKE 'idx_%'
    );
    RAISE NOTICE 'Created % materialized views for caching', 2;
    RAISE NOTICE 'Added % performance monitoring views', 3;
    RAISE NOTICE 'Created % performance analysis functions', 4;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RECOMMENDATIONS:';
    RAISE NOTICE '1. Run refresh_performance_caches() every 15 minutes';
    RAISE NOTICE '2. Run run_performance_maintenance() daily';
    RAISE NOTICE '3. Monitor index_usage_stats for unused indexes';
    RAISE NOTICE '4. Check get_cache_performance() for cache hit ratios';
    RAISE NOTICE '========================================';
END;
$$;