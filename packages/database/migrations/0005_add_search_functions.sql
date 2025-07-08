-- Enhanced Search Functions
-- Migration: 0005_add_search_functions.sql

-- Create function for ranked artist search
CREATE OR REPLACE FUNCTION search_artists_ranked(
  search_query TEXT,
  genre_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  image_url TEXT,
  popularity INTEGER,
  genres TEXT,
  followers INTEGER,
  verified BOOLEAN,
  rank REAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.slug,
    a.image_url,
    a.popularity,
    array_to_string(a.genres, ', ') as genres,
    a.followers,
    a.verified,
    CASE 
      WHEN a.search_vector IS NOT NULL THEN
        ts_rank(a.search_vector, websearch_to_tsquery('english', search_query))
      ELSE
        CASE 
          WHEN LOWER(a.name) = LOWER(search_query) THEN 1.0
          WHEN LOWER(a.name) LIKE LOWER(search_query || '%') THEN 0.8
          WHEN LOWER(a.name) LIKE LOWER('%' || search_query || '%') THEN 0.6
          ELSE 0.3
        END
    END AS rank
  FROM artists a
  WHERE 
    (a.search_vector IS NULL AND LOWER(a.name) ILIKE LOWER('%' || search_query || '%'))
    OR
    (a.search_vector IS NOT NULL AND a.search_vector @@ websearch_to_tsquery('english', search_query))
    AND
    (genre_filter IS NULL OR a.genres @> ARRAY[genre_filter])
  ORDER BY rank DESC, a.popularity DESC NULLS LAST
  LIMIT limit_count;
END;
$$;

-- Create function for nearby venue search
CREATE OR REPLACE FUNCTION search_venues_nearby(
  search_query TEXT DEFAULT NULL,
  user_lat DECIMAL DEFAULT NULL,
  user_lng DECIMAL DEFAULT NULL,
  radius_km INTEGER DEFAULT 50,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  city TEXT,
  state TEXT,
  image_url TEXT,
  capacity INTEGER,
  show_count INTEGER,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_km DECIMAL,
  rank REAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.name,
    v.slug,
    v.city,
    v.state,
    v.image_url,
    v.capacity,
    v.show_count,
    v.latitude,
    v.longitude,
    CASE 
      WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL THEN
        (6371 * acos(cos(radians(user_lat)) * cos(radians(v.latitude)) 
        * cos(radians(v.longitude) - radians(user_lng)) 
        + sin(radians(user_lat)) * sin(radians(v.latitude))))
      ELSE NULL
    END AS distance_km,
    CASE 
      WHEN search_query IS NULL THEN 1.0
      WHEN LOWER(v.name) = LOWER(search_query) THEN 1.0
      WHEN LOWER(v.name) LIKE LOWER(search_query || '%') THEN 0.8
      WHEN LOWER(v.city) LIKE LOWER(search_query || '%') THEN 0.6
      WHEN LOWER(v.name) LIKE LOWER('%' || search_query || '%') THEN 0.4
      ELSE 0.2
    END AS rank
  FROM venues v
  WHERE 
    (search_query IS NULL OR 
     LOWER(v.name) ILIKE LOWER('%' || search_query || '%') OR
     LOWER(v.city) ILIKE LOWER('%' || search_query || '%') OR
     LOWER(v.state) ILIKE LOWER('%' || search_query || '%'))
    AND
    (user_lat IS NULL OR user_lng IS NULL OR v.latitude IS NULL OR v.longitude IS NULL OR
     (6371 * acos(cos(radians(user_lat)) * cos(radians(v.latitude)) 
      * cos(radians(v.longitude) - radians(user_lng)) 
      + sin(radians(user_lat)) * sin(radians(v.latitude)))) <= radius_km)
  ORDER BY 
    CASE WHEN user_lat IS NOT NULL THEN distance_km END ASC NULLS LAST,
    rank DESC, 
    v.show_count DESC NULLS LAST
  LIMIT limit_count;
END;
$$;

-- Create function for comprehensive search analytics
CREATE OR REPLACE FUNCTION get_search_analytics_summary(
  days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  total_searches BIGINT,
  unique_users BIGINT,
  unique_sessions BIGINT,
  avg_response_time NUMERIC,
  click_through_rate NUMERIC,
  success_rate NUMERIC,
  top_no_result_queries TEXT[]
) 
LANGUAGE plpgsql
AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
BEGIN
  cutoff_date := NOW() - (days_back || ' days')::INTERVAL;
  
  RETURN QUERY
  WITH search_stats AS (
    SELECT 
      COUNT(*) as total_searches,
      COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
      COUNT(DISTINCT session_id) as unique_sessions,
      AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as avg_response_time,
      COUNT(*) FILTER (WHERE clicked_result_id IS NOT NULL)::NUMERIC / COUNT(*)::NUMERIC as click_through_rate,
      COUNT(*) FILTER (WHERE results_count > 0)::NUMERIC / COUNT(*)::NUMERIC as success_rate
    FROM search_analytics
    WHERE search_timestamp >= cutoff_date
  ),
  no_result_queries AS (
    SELECT array_agg(query ORDER BY count DESC) as top_queries
    FROM (
      SELECT query, COUNT(*) as count
      FROM search_analytics
      WHERE search_timestamp >= cutoff_date 
        AND results_count = 0
      GROUP BY query
      ORDER BY count DESC
      LIMIT 10
    ) t
  )
  SELECT 
    s.total_searches,
    s.unique_users,
    s.unique_sessions,
    ROUND(s.avg_response_time, 0) as avg_response_time,
    ROUND(s.click_through_rate * 100, 2) as click_through_rate,
    ROUND(s.success_rate * 100, 2) as success_rate,
    COALESCE(n.top_queries, ARRAY[]::TEXT[]) as top_no_result_queries
  FROM search_stats s
  CROSS JOIN no_result_queries n;
END;
$$;

-- Create function to get trending searches
CREATE OR REPLACE FUNCTION get_trending_searches(
  hours_back INTEGER DEFAULT 24,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  query TEXT,
  search_count BIGINT,
  hour_over_hour_growth NUMERIC,
  avg_results NUMERIC
) 
LANGUAGE plpgsql
AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
  previous_cutoff TIMESTAMPTZ;
BEGIN
  cutoff_date := NOW() - (hours_back || ' hours')::INTERVAL;
  previous_cutoff := cutoff_date - (hours_back || ' hours')::INTERVAL;
  
  RETURN QUERY
  WITH current_period AS (
    SELECT 
      query,
      COUNT(*) as search_count,
      AVG(results_count) as avg_results
    FROM search_analytics
    WHERE search_timestamp >= cutoff_date
    GROUP BY query
  ),
  previous_period AS (
    SELECT 
      query,
      COUNT(*) as search_count
    FROM search_analytics
    WHERE search_timestamp >= previous_cutoff 
      AND search_timestamp < cutoff_date
    GROUP BY query
  )
  SELECT 
    c.query,
    c.search_count,
    CASE 
      WHEN p.search_count IS NULL OR p.search_count = 0 THEN 100.0
      ELSE ROUND(((c.search_count - p.search_count)::NUMERIC / p.search_count::NUMERIC) * 100, 2)
    END as hour_over_hour_growth,
    ROUND(c.avg_results, 1) as avg_results
  FROM current_period c
  LEFT JOIN previous_period p ON c.query = p.query
  WHERE c.search_count >= 2  -- Filter out single searches
  ORDER BY c.search_count DESC, hour_over_hour_growth DESC
  LIMIT limit_count;
END;
$$;

-- Create materialized view for search performance dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS search_performance_summary AS
SELECT 
  DATE_TRUNC('hour', search_timestamp) as hour,
  COUNT(*) as total_searches,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as avg_response_time,
  COUNT(*) FILTER (WHERE clicked_result_id IS NOT NULL)::NUMERIC / COUNT(*)::NUMERIC * 100 as click_through_rate,
  COUNT(*) FILTER (WHERE results_count > 0)::NUMERIC / COUNT(*)::NUMERIC * 100 as success_rate,
  AVG(results_count) as avg_results_per_search
FROM search_analytics
WHERE search_timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('hour', search_timestamp)
ORDER BY hour DESC;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS search_performance_summary_hour_idx 
ON search_performance_summary (hour);

-- Create function to refresh search performance summary
CREATE OR REPLACE FUNCTION refresh_search_performance_summary()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY search_performance_summary;
END;
$$;

-- Create saved search alerts function
CREATE OR REPLACE FUNCTION check_saved_search_alerts()
RETURNS TABLE (
  saved_search_id UUID,
  user_id UUID,
  search_name TEXT,
  new_results_count BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH recent_results AS (
    -- This would need to be implemented based on actual search logic
    -- For now, return empty results
    SELECT 
      ss.id as saved_search_id,
      ss.user_id,
      ss.name as search_name,
      0::BIGINT as new_results_count
    FROM saved_searches ss
    WHERE ss.notification_enabled = true
      AND ss.last_checked < NOW() - INTERVAL '1 hour'
    LIMIT 0  -- Disable for now until search alert logic is implemented
  )
  SELECT * FROM recent_results;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION search_artists_ranked TO authenticated;
GRANT EXECUTE ON FUNCTION search_venues_nearby TO authenticated;
GRANT EXECUTE ON FUNCTION get_search_analytics_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_searches TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_search_performance_summary TO authenticated;
GRANT EXECUTE ON FUNCTION check_saved_search_alerts TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_search_analytics_compound 
ON search_analytics(search_timestamp DESC, query, results_count);

CREATE INDEX IF NOT EXISTS idx_search_analytics_user_session 
ON search_analytics(user_id, session_id, search_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_popular_searches_updated 
ON popular_searches(updated_at DESC, count DESC);

-- Set up automatic refresh of performance summary (run every hour)
SELECT cron.schedule(
  'refresh-search-performance',
  '0 * * * *',  -- Every hour
  'SELECT refresh_search_performance_summary();'
) WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');