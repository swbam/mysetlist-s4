-- Function to get user activity for analytics
CREATE OR REPLACE FUNCTION get_user_activity(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  type TEXT,
  timestamp TIMESTAMPTZ,
  details JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH all_activities AS (
    -- Shows attended
    SELECT 
      us.id,
      'show_attended'::TEXT as type,
      us.created_at as timestamp,
      jsonb_build_object(
        'show_id', s.id,
        'show_name', s.name,
        'artist_name', a.name,
        'venue_name', v.name,
        'show_date', s.date
      ) as details
    FROM user_shows us
    JOIN shows s ON s.id = us.show_id
    JOIN artists a ON a.id = s.artist_id
    JOIN venues v ON v.id = s.venue_id
    WHERE us.user_id = p_user_id
    
    UNION ALL
    
    -- Artists followed
    SELECT 
      ua.id,
      'artist_followed'::TEXT as type,
      ua.created_at as timestamp,
      jsonb_build_object(
        'artist_id', a.id,
        'artist_name', a.name
      ) as details
    FROM user_artists ua
    JOIN artists a ON a.id = ua.artist_id
    WHERE ua.user_id = p_user_id
    
    UNION ALL
    
    -- Votes cast
    SELECT 
      sv.id,
      'vote_cast'::TEXT as type,
      sv.created_at as timestamp,
      jsonb_build_object(
        'song_id', sg.id,
        'song_name', sg.title,
        'show_id', s.id,
        'show_name', s.name,
        'artist_name', a.name
      ) as details
    FROM song_votes sv
    JOIN songs sg ON sg.id = sv.song_id
    JOIN shows s ON s.id = sv.show_id
    JOIN artists a ON a.id = s.artist_id
    WHERE sv.user_id = p_user_id
    
    UNION ALL
    
    -- Setlists created
    SELECT 
      sl.id,
      'setlist_created'::TEXT as type,
      sl.created_at as timestamp,
      jsonb_build_object(
        'setlist_id', sl.id,
        'show_id', s.id,
        'show_name', s.name,
        'artist_name', a.name
      ) as details
    FROM setlists sl
    JOIN shows s ON s.id = sl.show_id
    JOIN artists a ON a.id = s.artist_id
    WHERE sl.created_by = p_user_id
  )
  SELECT * FROM all_activities
  ORDER BY timestamp DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Function to get database statistics
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'activeConnections', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    'maxConnections', current_setting('max_connections')::int,
    'avgQueryTime', (
      SELECT ROUND(AVG(mean_exec_time)::numeric, 2) 
      FROM pg_stat_statements 
      WHERE query NOT LIKE '%pg_stat%'
    ),
    'slowQueries', (
      SELECT count(*) 
      FROM pg_stat_statements 
      WHERE mean_exec_time > 1000
    ),
    'dbSize', pg_database_size(current_database()),
    'totalRecords', (
      SELECT sum(n_live_tup) 
      FROM pg_stat_user_tables
    ),
    'showCount', (SELECT count(*) FROM shows),
    'artistCount', (SELECT count(*) FROM artists),
    'userCount', (SELECT count(*) FROM profiles),
    'venueCount', (SELECT count(*) FROM venues)
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Function to get API statistics
CREATE OR REPLACE FUNCTION get_api_stats()
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  -- This would normally come from an API monitoring table
  -- For now, returning mock data structure
  SELECT jsonb_build_object(
    'avgResponseTime', 150,
    'errorRate', 0.5,
    'endpoints', jsonb_build_object(
      '/api/shows', jsonb_build_object('avgTime', 120, 'errorRate', 0.2),
      '/api/artists', jsonb_build_object('avgTime', 100, 'errorRate', 0.1),
      '/api/venues', jsonb_build_object('avgTime', 110, 'errorRate', 0.3),
      '/api/setlists', jsonb_build_object('avgTime', 200, 'errorRate', 0.5)
    )
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Function to get user activity statistics
CREATE OR REPLACE FUNCTION get_user_activity_stats()
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  current_active INT;
  previous_active INT;
  trend NUMERIC;
BEGIN
  -- Get current hour active users
  SELECT count(DISTINCT user_id) INTO current_active
  FROM (
    SELECT user_id FROM user_shows WHERE created_at > NOW() - INTERVAL '1 hour'
    UNION
    SELECT user_id FROM user_artists WHERE created_at > NOW() - INTERVAL '1 hour'
    UNION
    SELECT user_id FROM song_votes WHERE created_at > NOW() - INTERVAL '1 hour'
  ) active_users;
  
  -- Get previous hour active users
  SELECT count(DISTINCT user_id) INTO previous_active
  FROM (
    SELECT user_id FROM user_shows WHERE created_at BETWEEN NOW() - INTERVAL '2 hours' AND NOW() - INTERVAL '1 hour'
    UNION
    SELECT user_id FROM user_artists WHERE created_at BETWEEN NOW() - INTERVAL '2 hours' AND NOW() - INTERVAL '1 hour'
    UNION
    SELECT user_id FROM song_votes WHERE created_at BETWEEN NOW() - INTERVAL '2 hours' AND NOW() - INTERVAL '1 hour'
  ) active_users;
  
  -- Calculate trend
  IF previous_active > 0 THEN
    trend := ROUND(((current_active::numeric - previous_active) / previous_active) * 100, 1);
  ELSE
    trend := 0;
  END IF;
  
  SELECT jsonb_build_object(
    'activeUsers', current_active,
    'trend', trend
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Create user privacy settings table
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  show_attended_shows BOOLEAN DEFAULT true,
  show_followed_artists BOOLEAN DEFAULT true,
  show_voting_history BOOLEAN DEFAULT false,
  allow_analytics BOOLEAN DEFAULT true,
  allow_marketing BOOLEAN DEFAULT false,
  allow_email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create error logs table for monitoring
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT DEFAULT 'ERROR',
  message TEXT NOT NULL,
  endpoint TEXT,
  user_id UUID REFERENCES auth.users(id),
  stack_trace TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_user_privacy_settings_user_id ON user_privacy_settings(user_id);

-- Function to delete user account and all data
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete user data from all tables
  DELETE FROM user_shows WHERE user_id = p_user_id;
  DELETE FROM user_artists WHERE user_id = p_user_id;
  DELETE FROM song_votes WHERE user_id = p_user_id;
  DELETE FROM venue_reviews WHERE user_id = p_user_id;
  DELETE FROM venue_tips WHERE user_id = p_user_id;
  DELETE FROM venue_photos WHERE uploaded_by = p_user_id;
  DELETE FROM show_comments WHERE user_id = p_user_id;
  DELETE FROM setlists WHERE created_by = p_user_id;
  DELETE FROM user_privacy_settings WHERE user_id = p_user_id;
  DELETE FROM profiles WHERE id = p_user_id;
  
  -- Delete auth user (this will cascade to profile due to foreign key)
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;