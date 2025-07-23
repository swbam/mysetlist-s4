-- Performance Optimization SQL for MySetlist Database
-- Adds indexes, optimizes queries, and improves overall database performance

-- =============================================================================
-- INDEX OPTIMIZATIONS
-- =============================================================================

-- Artists table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_slug ON artists(slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_spotify_id ON artists(spotify_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_mbid ON artists(mbid);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_trending_score ON artists(trending_score DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_total_followers ON artists(total_followers DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_created_at ON artists(created_at DESC);

-- Shows table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_slug ON shows(slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_artist_id ON shows(artist_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_venue_id ON shows(venue_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_show_date ON shows(show_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_status ON shows(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_trending_score ON shows(trending_score DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_created_at ON shows(created_at DESC);

-- Composite index for common show queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_artist_date ON shows(artist_id, show_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_venue_date ON shows(venue_id, show_date DESC);

-- Venues table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_slug ON venues(slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_city ON venues(city);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_country ON venues(country);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_location ON venues(city, country);

-- Setlist songs optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_songs_show_id ON setlist_songs(show_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_songs_song_id ON setlist_songs(song_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_songs_order ON setlist_songs(song_order);

-- Composite index for setlist queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_songs_show_order ON setlist_songs(show_id, song_order);

-- Songs table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_artist_id ON songs(artist_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_spotify_id ON songs(spotify_id);

-- Votes table optimizations  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_setlist_song_id ON votes(setlist_song_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_created_at ON votes(created_at DESC);

-- Composite index for vote queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_song_user ON votes(setlist_song_id, user_id);

-- User profiles optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_updated_at ON user_profiles(updated_at DESC);

-- User follows optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_follows_user_id ON user_follows(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_follows_artist_id ON user_follows(artist_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_follows_created_at ON user_follows(created_at DESC);

-- Composite index for follow queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_follows_user_artist ON user_follows(user_id, artist_id);

-- =============================================================================
-- PERFORMANCE VIEWS FOR COMMON QUERIES
-- =============================================================================

-- Materialized view for trending artists (updated via cron)
DROP MATERIALIZED VIEW IF EXISTS trending_artists_mv;
CREATE MATERIALIZED VIEW trending_artists_mv AS
SELECT 
  a.id,
  a.name,
  a.slug,
  a.image_url,
  a.spotify_id,
  a.total_followers,
  a.trending_score,
  COUNT(DISTINCT s.id) as upcoming_shows_count,
  COUNT(DISTINCT v.id) as total_votes_count,
  AVG(v.vote_type::int) as avg_vote_score
FROM artists a
LEFT JOIN shows s ON a.id = s.artist_id AND s.show_date > NOW()
LEFT JOIN setlist_songs ss ON s.id = ss.show_id
LEFT JOIN votes v ON ss.id = v.setlist_song_id AND v.created_at > NOW() - INTERVAL '7 days'
WHERE a.trending_score IS NOT NULL
GROUP BY a.id, a.name, a.slug, a.image_url, a.spotify_id, a.total_followers, a.trending_score
ORDER BY a.trending_score DESC, total_votes_count DESC;

-- Create index on the materialized view
CREATE INDEX idx_trending_artists_mv_score ON trending_artists_mv(trending_score DESC);
CREATE INDEX idx_trending_artists_mv_votes ON trending_artists_mv(total_votes_count DESC);

-- Materialized view for trending shows
DROP MATERIALIZED VIEW IF EXISTS trending_shows_mv;
CREATE MATERIALIZED VIEW trending_shows_mv AS
SELECT 
  s.id,
  s.name,
  s.slug,
  s.show_date,
  s.artist_id,
  s.venue_id,
  s.trending_score,
  a.name as artist_name,
  a.image_url as artist_image,
  v_table.name as venue_name,
  v_table.city as venue_city,
  COUNT(DISTINCT votes.id) as total_votes,
  COUNT(DISTINCT ss.id) as songs_count
FROM shows s
JOIN artists a ON s.artist_id = a.id
JOIN venues v_table ON s.venue_id = v_table.id
LEFT JOIN setlist_songs ss ON s.id = ss.show_id
LEFT JOIN votes ON ss.id = votes.setlist_song_id
WHERE s.show_date > NOW() - INTERVAL '30 days'
  AND s.trending_score IS NOT NULL
GROUP BY s.id, s.name, s.slug, s.show_date, s.artist_id, s.venue_id, 
         s.trending_score, a.name, a.image_url, v_table.name, v_table.city
ORDER BY s.trending_score DESC, total_votes DESC;

-- Create index on trending shows view
CREATE INDEX idx_trending_shows_mv_score ON trending_shows_mv(trending_score DESC);
CREATE INDEX idx_trending_shows_mv_date ON trending_shows_mv(show_date DESC);

-- =============================================================================
-- OPTIMIZED FUNCTIONS FOR COMMON OPERATIONS
-- =============================================================================

-- Function to get artist with stats (replaces multiple queries)
CREATE OR REPLACE FUNCTION get_artist_with_stats(artist_slug_param TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'artist', row_to_json(artist_data),
    'stats', json_build_object(
      'total_shows', COALESCE(stats.total_shows, 0),
      'upcoming_shows', COALESCE(stats.upcoming_shows, 0),
      'total_songs', COALESCE(stats.total_songs, 0),
      'total_votes', COALESCE(stats.total_votes, 0),
      'followers', COALESCE(artist_data.total_followers, 0)
    ),
    'recent_shows', COALESCE(recent_shows.shows, '[]'::json)
  ) INTO result
  FROM (
    SELECT a.*
    FROM artists a
    WHERE a.slug = artist_slug_param
  ) artist_data
  LEFT JOIN (
    SELECT 
      s.artist_id,
      COUNT(*) as total_shows,
      COUNT(CASE WHEN s.show_date > NOW() THEN 1 END) as upcoming_shows,
      COUNT(DISTINCT ss.song_id) as total_songs,
      COUNT(DISTINCT v.id) as total_votes
    FROM shows s
    LEFT JOIN setlist_songs ss ON s.id = ss.show_id
    LEFT JOIN votes v ON ss.id = v.setlist_song_id
    WHERE s.artist_id = (SELECT id FROM artists WHERE slug = artist_slug_param)
    GROUP BY s.artist_id
  ) stats ON artist_data.id = stats.artist_id
  LEFT JOIN (
    SELECT json_agg(
      json_build_object(
        'id', s.id,
        'name', s.name,
        'slug', s.slug,
        'show_date', s.show_date,
        'venue_name', v.name,
        'venue_city', v.city
      ) ORDER BY s.show_date DESC
    ) as shows
    FROM shows s
    JOIN venues v ON s.venue_id = v.id
    WHERE s.artist_id = (SELECT id FROM artists WHERE slug = artist_slug_param)
      AND s.show_date > NOW() - INTERVAL '6 months'
    LIMIT 10
  ) recent_shows ON true;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get show with setlist and votes (optimized single query)
CREATE OR REPLACE FUNCTION get_show_with_setlist(show_slug_param TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'show', row_to_json(show_data),
    'artist', row_to_json(artist_data),
    'venue', row_to_json(venue_data),
    'setlist', COALESCE(setlist_data.songs, '[]'::json),
    'stats', json_build_object(
      'total_votes', COALESCE(stats.total_votes, 0),
      'total_songs', COALESCE(stats.total_songs, 0),
      'avg_score', COALESCE(stats.avg_score, 0)
    )
  ) INTO result
  FROM (
    SELECT s.*
    FROM shows s
    WHERE s.slug = show_slug_param
  ) show_data
  LEFT JOIN artists artist_data ON show_data.artist_id = artist_data.id
  LEFT JOIN venues venue_data ON show_data.venue_id = venue_data.id
  LEFT JOIN (
    SELECT json_agg(
      json_build_object(
        'id', ss.id,
        'song_id', ss.song_id,
        'song_title', song.title,
        'song_order', ss.song_order,
        'is_encore', ss.is_encore,
        'votes', json_build_object(
          'total', COALESCE(vote_stats.total_votes, 0),
          'upvotes', COALESCE(vote_stats.upvotes, 0),
          'downvotes', COALESCE(vote_stats.downvotes, 0),
          'score', COALESCE(vote_stats.score, 0)
        )
      ) ORDER BY ss.song_order
    ) as songs
    FROM setlist_songs ss
    JOIN songs song ON ss.song_id = song.id
    LEFT JOIN (
      SELECT 
        v.setlist_song_id,
        COUNT(*) as total_votes,
        COUNT(CASE WHEN v.vote_type = 1 THEN 1 END) as upvotes,
        COUNT(CASE WHEN v.vote_type = -1 THEN 1 END) as downvotes,
        SUM(v.vote_type) as score
      FROM votes v
      GROUP BY v.setlist_song_id
    ) vote_stats ON ss.id = vote_stats.setlist_song_id
    WHERE ss.show_id = show_data.id
  ) setlist_data ON true
  LEFT JOIN (
    SELECT 
      COUNT(DISTINCT v.id) as total_votes,
      COUNT(DISTINCT ss.id) as total_songs,
      AVG(v.vote_type) as avg_score
    FROM setlist_songs ss
    LEFT JOIN votes v ON ss.id = v.setlist_song_id
    WHERE ss.show_id = show_data.id
  ) stats ON true;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- QUERY OPTIMIZATION SETTINGS
-- =============================================================================

-- Optimize PostgreSQL settings for better performance
-- These should be set in postgresql.conf or via environment variables

-- Increase work_mem for complex queries (set per session as needed)
-- SET work_mem = '256MB';

-- Enable parallel queries for better performance on multi-core systems
-- SET max_parallel_workers_per_gather = 4;

-- Optimize random page cost for SSD storage
-- SET random_page_cost = 1.1;

-- Increase shared buffers (typically 25% of RAM)
-- SET shared_buffers = '2GB';

-- Optimize checkpoint settings
-- SET checkpoint_segments = 16;
-- SET checkpoint_completion_target = 0.9;

-- =============================================================================
-- MAINTENANCE COMMANDS
-- =============================================================================

-- Auto-vacuum settings for high-traffic tables
ALTER TABLE votes SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE setlist_songs SET (
  autovacuum_vacuum_scale_factor = 0.2,
  autovacuum_analyze_scale_factor = 0.1
);

-- Update statistics for better query planning
ANALYZE artists;
ANALYZE shows;
ANALYZE venues;
ANALYZE setlist_songs;
ANALYZE votes;

-- =============================================================================
-- REFRESH MATERIALIZED VIEWS (to be run via cron)
-- =============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_trending_data()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY trending_artists_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY trending_shows_mv;
  
  -- Update table statistics after refresh
  ANALYZE trending_artists_mv;
  ANALYZE trending_shows_mv;
  
  -- Log the refresh
  INSERT INTO system_logs (log_type, message, created_at)
  VALUES ('performance', 'Trending data refreshed successfully', NOW());
  
  EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO system_logs (log_type, message, created_at)
    VALUES ('error', 'Failed to refresh trending data: ' || SQLERRM, NOW());
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PERFORMANCE MONITORING QUERIES
-- =============================================================================

-- Query to find slow queries (use with pg_stat_statements extension)
/*
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time,
  rows
FROM pg_stat_statements
WHERE mean_time > 100  -- queries taking more than 100ms on average
ORDER BY mean_time DESC
LIMIT 20;
*/

-- Query to find missing indexes
/*
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1
ORDER BY n_distinct DESC;
*/

-- Query to monitor index usage
/*
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0  -- unused indexes
ORDER BY idx_tup_read DESC;
*/