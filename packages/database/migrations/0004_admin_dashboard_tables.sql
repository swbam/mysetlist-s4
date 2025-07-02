-- Admin Dashboard Enhancement Tables
-- Add admin-specific tables for better platform management

-- System monitoring table
CREATE TABLE IF NOT EXISTS system_health (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  response_time INTEGER, -- in milliseconds
  error_count INTEGER DEFAULT 0,
  last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content moderation table enhancement
CREATE TABLE IF NOT EXISTS content_moderation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type VARCHAR(50) NOT NULL, -- 'show', 'review', 'comment', 'photo', etc.
  content_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderator_id UUID REFERENCES users(id),
  reason TEXT,
  action_taken VARCHAR(100),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES users(id),
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  assigned_to UUID REFERENCES users(id),
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Moderation logs table
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  moderator_id UUID REFERENCES users(id) NOT NULL,
  target_type VARCHAR(50) NOT NULL, -- 'user', 'show', 'review', etc.
  target_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL, -- 'banned', 'warned', 'approved', etc.
  reason TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform statistics table enhancement
CREATE TABLE IF NOT EXISTS platform_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_date DATE NOT NULL,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_shows INTEGER DEFAULT 0,
  new_shows INTEGER DEFAULT 0,
  total_setlists INTEGER DEFAULT 0,
  new_setlists INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  new_votes INTEGER DEFAULT 0,
  new_reviews INTEGER DEFAULT 0,
  new_photos INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(stat_date)
);

-- User activity log table
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'security', 'moderation', 'performance', 'error'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  read BOOLEAN DEFAULT FALSE,
  actionable BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data backup tracking
CREATE TABLE IF NOT EXISTS data_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'schema'
  file_path TEXT NOT NULL,
  file_size_mb INTEGER,
  compression_type VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_health_service_status ON system_health(service_name, status);
CREATE INDEX IF NOT EXISTS idx_content_moderation_status ON content_moderation(status, created_at);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_moderator ON moderation_logs(moderator_id, created_at);
CREATE INDEX IF NOT EXISTS idx_platform_stats_date ON platform_stats(stat_date);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_date ON user_activity_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read, severity, created_at);

-- Create views for common admin queries
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
  (SELECT COUNT(*) FROM users WHERE last_login_at > NOW() - INTERVAL '7 days') as active_users_7d,
  (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24 hours') as new_users_today,
  (SELECT COUNT(*) FROM shows) as total_shows,
  (SELECT COUNT(*) FROM shows WHERE created_at > NOW() - INTERVAL '24 hours') as new_shows_today,
  (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
  (SELECT COUNT(*) FROM content_moderation WHERE status = 'pending') as pending_moderation,
  (SELECT COUNT(*) FROM admin_notifications WHERE read = FALSE) as unread_notifications;

-- Function to update platform stats daily
CREATE OR REPLACE FUNCTION update_daily_platform_stats()
RETURNS void AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
BEGIN
  INSERT INTO platform_stats (
    stat_date,
    total_users,
    active_users,
    new_users,
    total_shows,
    new_shows,
    total_setlists,
    new_setlists,
    total_votes,
    new_votes,
    new_reviews,
    new_photos,
    storage_used_mb
  )
  VALUES (
    today_date,
    (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL),
    (SELECT COUNT(*) FROM users WHERE last_login_at > CURRENT_DATE - INTERVAL '7 days'),
    (SELECT COUNT(*) FROM users WHERE created_at::date = today_date),
    (SELECT COUNT(*) FROM shows),
    (SELECT COUNT(*) FROM shows WHERE created_at::date = today_date),
    (SELECT COUNT(*) FROM setlists),
    (SELECT COUNT(*) FROM setlists WHERE created_at::date = today_date),
    (SELECT COUNT(*) FROM setlist_song_votes),
    (SELECT COUNT(*) FROM setlist_song_votes WHERE created_at::date = today_date),
    (SELECT COUNT(*) FROM venue_reviews WHERE created_at::date = today_date),
    0, -- photos count placeholder
    0  -- storage used placeholder
  )
  ON CONFLICT (stat_date) 
  DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    new_users = EXCLUDED.new_users,
    total_shows = EXCLUDED.total_shows,
    new_shows = EXCLUDED.new_shows,
    total_setlists = EXCLUDED.total_setlists,
    new_setlists = EXCLUDED.new_setlists,
    total_votes = EXCLUDED.total_votes,
    new_votes = EXCLUDED.new_votes,
    new_reviews = EXCLUDED.new_reviews,
    new_photos = EXCLUDED.new_photos,
    storage_used_mb = EXCLUDED.storage_used_mb,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;