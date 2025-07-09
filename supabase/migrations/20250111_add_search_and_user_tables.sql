-- Create search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  query TEXT NOT NULL,
  search_type VARCHAR(50) NOT NULL, -- 'artist', 'venue', 'show', 'global'
  results_count INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  clicked_result_id UUID,
  clicked_result_type VARCHAR(50),
  clicked_result_position INTEGER,
  search_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  user_agent TEXT,
  ip_address INET,
  metadata JSONB
);

-- Create saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  query TEXT NOT NULL,
  search_type VARCHAR(50) NOT NULL,
  filters JSONB,
  notification_enabled BOOLEAN DEFAULT false,
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, name)
);

-- Create popular searches table
CREATE TABLE IF NOT EXISTS popular_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  search_type VARCHAR(50) NOT NULL,
  count INTEGER DEFAULT 1,
  last_searched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(query, search_type)
);

-- Create artist followers table (for tracking follow relationships)
CREATE TABLE IF NOT EXISTS artist_followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  notification_enabled BOOLEAN DEFAULT true,
  UNIQUE(artist_id, user_id)
);

-- Create user bans table
CREATE TABLE IF NOT EXISTS user_bans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  ban_type VARCHAR(50) DEFAULT 'temporary', -- 'temporary', 'permanent'
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  lifted_at TIMESTAMP WITH TIME ZONE,
  lifted_by UUID REFERENCES users(id),
  lift_reason TEXT
);

-- Create indexes for search analytics
CREATE INDEX idx_search_analytics_user ON search_analytics(user_id);
CREATE INDEX idx_search_analytics_session ON search_analytics(session_id);
CREATE INDEX idx_search_analytics_query ON search_analytics(query);
CREATE INDEX idx_search_analytics_timestamp ON search_analytics(search_timestamp DESC);
CREATE INDEX idx_search_analytics_type ON search_analytics(search_type);
CREATE INDEX idx_search_analytics_clicked ON search_analytics(clicked_result_id) WHERE clicked_result_id IS NOT NULL;

-- Create indexes for saved searches
CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_notification ON saved_searches(notification_enabled) WHERE notification_enabled = true;

-- Create indexes for popular searches
CREATE INDEX idx_popular_searches_query ON popular_searches(query);
CREATE INDEX idx_popular_searches_count ON popular_searches(count DESC);
CREATE INDEX idx_popular_searches_type ON popular_searches(search_type);

-- Create indexes for artist followers
CREATE INDEX idx_artist_followers_artist ON artist_followers(artist_id);
CREATE INDEX idx_artist_followers_user ON artist_followers(user_id);
CREATE INDEX idx_artist_followers_followed ON artist_followers(followed_at DESC);

-- Create indexes for user bans
CREATE INDEX idx_user_bans_user ON user_bans(user_id);
CREATE INDEX idx_user_bans_active ON user_bans(user_id) WHERE lifted_at IS NULL;
CREATE INDEX idx_user_bans_expires ON user_bans(expires_at) WHERE expires_at IS NOT NULL AND lifted_at IS NULL;

-- Enable RLS on all tables
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE popular_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;

-- RLS policies for search_analytics
CREATE POLICY search_analytics_select ON search_analytics
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY search_analytics_insert ON search_analytics
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS policies for saved_searches
CREATE POLICY saved_searches_select ON saved_searches
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY saved_searches_insert ON saved_searches
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY saved_searches_update ON saved_searches
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY saved_searches_delete ON saved_searches
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS policies for popular_searches (public read)
CREATE POLICY popular_searches_select ON popular_searches
  FOR SELECT TO authenticated
  USING (true);

-- RLS policies for artist_followers
CREATE POLICY artist_followers_select ON artist_followers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY artist_followers_insert ON artist_followers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY artist_followers_delete ON artist_followers
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS policies for user_bans (admins only)
CREATE POLICY user_bans_select ON user_bans
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY user_bans_admin_all ON user_bans
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_saved_searches_updated_at BEFORE UPDATE ON saved_searches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_popular_searches_updated_at BEFORE UPDATE ON popular_searches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_bans_updated_at BEFORE UPDATE ON user_bans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment popular search count
CREATE OR REPLACE FUNCTION increment_popular_search(
  p_query TEXT,
  p_search_type VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO popular_searches (query, search_type, count, last_searched)
  VALUES (p_query, p_search_type, 1, NOW())
  ON CONFLICT (query, search_type)
  DO UPDATE SET 
    count = popular_searches.count + 1,
    last_searched = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is banned
CREATE OR REPLACE FUNCTION is_user_banned(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_bans
    WHERE user_id = p_user_id
    AND lifted_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_popular_search TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_banned TO authenticated;