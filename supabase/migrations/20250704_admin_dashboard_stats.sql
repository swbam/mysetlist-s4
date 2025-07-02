-- Admin dashboard statistics function used by QuickStats component
-- Returns simple counts so we avoid complex joins client side

CREATE OR REPLACE FUNCTION admin_dashboard_stats()
RETURNS TABLE (
  trending_artists INTEGER,
  hot_shows INTEGER,
  search_volume INTEGER,
  active_users INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM artists WHERE trending_score > 0) AS trending_artists,
    (SELECT COUNT(*) FROM shows WHERE status = 'upcoming' AND trending_score > 0) AS hot_shows,
    (SELECT COUNT(*) FROM search_analytics WHERE search_timestamp >= NOW() - INTERVAL '24 hours') AS search_volume,
    (SELECT COUNT(*) FROM users WHERE last_login_at >= NOW() - INTERVAL '15 minutes') AS active_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_dashboard_stats() TO anon;