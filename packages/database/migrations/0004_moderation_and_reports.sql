-- Create report_reason enum
CREATE TYPE "report_reason" AS ENUM(
  'spam',
  'inappropriate_content',
  'harassment',
  'misinformation',
  'copyright',
  'other'
);

-- Create moderation_status enum
CREATE TYPE "moderation_status" AS ENUM(
  'pending',
  'approved',
  'rejected',
  'flagged',
  'deleted'
);

-- Create moderation_action_type enum
CREATE TYPE "moderation_action_type" AS ENUM(
  'approve',
  'reject',
  'delete',
  'ban_user',
  'suspend_user',
  'warn_user',
  'feature_content',
  'verify_artist',
  'unverify_artist'
);

-- Create reports table for user-generated reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id),
  reported_user_id UUID REFERENCES users(id),
  content_type TEXT NOT NULL, -- 'setlist', 'review', 'photo', 'tip', 'comment'
  content_id UUID NOT NULL,
  reason report_reason NOT NULL,
  description TEXT,
  status moderation_status DEFAULT 'pending' NOT NULL,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create moderation_logs table for admin actions
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID NOT NULL REFERENCES users(id),
  action moderation_action_type NOT NULL,
  target_type TEXT NOT NULL, -- 'user', 'setlist', 'review', 'photo', 'tip', 'comment', 'artist', 'show'
  target_id UUID NOT NULL,
  reason TEXT,
  notes TEXT,
  metadata JSONB, -- Additional data like ban duration, previous values, etc
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create user_bans table
CREATE TABLE IF NOT EXISTS user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  banned_by UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  ban_type TEXT NOT NULL CHECK (ban_type IN ('permanent', 'temporary')),
  banned_until TIMESTAMP, -- NULL for permanent bans
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  lifted_at TIMESTAMP,
  lifted_by UUID REFERENCES users(id),
  lift_reason TEXT
);

-- Create content_moderation table for tracking moderation status
CREATE TABLE IF NOT EXISTS content_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  status moderation_status DEFAULT 'pending' NOT NULL,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  auto_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(content_type, content_id)
);

-- Create platform_stats table for analytics
CREATE TABLE IF NOT EXISTS platform_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL,
  total_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  total_shows INTEGER DEFAULT 0,
  new_shows INTEGER DEFAULT 0,
  total_setlists INTEGER DEFAULT 0,
  new_setlists INTEGER DEFAULT 0,
  total_artists INTEGER DEFAULT 0,
  new_artists INTEGER DEFAULT 0,
  total_venues INTEGER DEFAULT 0,
  new_venues INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  new_reviews INTEGER DEFAULT 0,
  total_photos INTEGER DEFAULT 0,
  new_photos INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  new_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(stat_date)
);

-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  type TEXT NOT NULL, -- 'new_report', 'pending_moderation', 'user_milestone', 'system_alert'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add moderation fields to existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS warning_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_warning_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS content_flags INTEGER DEFAULT 0;

ALTER TABLE setlists ADD COLUMN IF NOT EXISTS moderation_status moderation_status DEFAULT 'pending';
ALTER TABLE setlists ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE setlists ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);

ALTER TABLE venue_reviews ADD COLUMN IF NOT EXISTS moderation_status moderation_status DEFAULT 'pending';
ALTER TABLE venue_reviews ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE venue_reviews ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE venue_reviews ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;

ALTER TABLE venue_photos ADD COLUMN IF NOT EXISTS moderation_status moderation_status DEFAULT 'pending';
ALTER TABLE venue_photos ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE venue_photos ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE venue_photos ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;

ALTER TABLE venue_insider_tips ADD COLUMN IF NOT EXISTS moderation_status moderation_status DEFAULT 'pending';
ALTER TABLE venue_insider_tips ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE venue_insider_tips ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE venue_insider_tips ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX idx_reports_status ON reports(status) WHERE status = 'pending';
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_content ON reports(content_type, content_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

CREATE INDEX idx_moderation_logs_moderator ON moderation_logs(moderator_id);
CREATE INDEX idx_moderation_logs_target ON moderation_logs(target_type, target_id);
CREATE INDEX idx_moderation_logs_created_at ON moderation_logs(created_at DESC);

CREATE INDEX idx_user_bans_user ON user_bans(user_id);
CREATE INDEX idx_user_bans_active ON user_bans(user_id) WHERE lifted_at IS NULL;

CREATE INDEX idx_content_moderation_content ON content_moderation(content_type, content_id);
CREATE INDEX idx_content_moderation_status ON content_moderation(status);
CREATE INDEX idx_content_moderation_pending ON content_moderation(status) WHERE status = 'pending';

CREATE INDEX idx_platform_stats_date ON platform_stats(stat_date DESC);

CREATE INDEX idx_admin_notifications_admin ON admin_notifications(admin_id);
CREATE INDEX idx_admin_notifications_unread ON admin_notifications(admin_id, read) WHERE read = FALSE;
CREATE INDEX idx_admin_notifications_created ON admin_notifications(created_at DESC);

-- Create triggers for updated_at
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_moderation_updated_at BEFORE UPDATE ON content_moderation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to check if user is banned
CREATE OR REPLACE FUNCTION is_user_banned(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_bans
        WHERE user_id = user_uuid
        AND lifted_at IS NULL
        AND (banned_until IS NULL OR banned_until > NOW())
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-populate platform stats
CREATE OR REPLACE FUNCTION update_platform_stats()
RETURNS void AS $$
BEGIN
    INSERT INTO platform_stats (
        stat_date,
        total_users,
        new_users,
        active_users,
        total_shows,
        new_shows,
        total_setlists,
        new_setlists,
        total_artists,
        new_artists,
        total_venues,
        new_venues,
        total_reviews,
        new_reviews,
        total_photos,
        new_photos,
        total_votes,
        new_votes
    )
    SELECT
        CURRENT_DATE,
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL),
        (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURRENT_DATE),
        (SELECT COUNT(DISTINCT user_id) FROM votes WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days'),
        (SELECT COUNT(*) FROM shows),
        (SELECT COUNT(*) FROM shows WHERE DATE(created_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM setlists),
        (SELECT COUNT(*) FROM setlists WHERE DATE(created_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM artists),
        (SELECT COUNT(*) FROM artists WHERE DATE(created_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM venues),
        (SELECT COUNT(*) FROM venues WHERE DATE(created_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM venue_reviews),
        (SELECT COUNT(*) FROM venue_reviews WHERE DATE(created_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM venue_photos),
        (SELECT COUNT(*) FROM venue_photos WHERE DATE(created_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM votes),
        (SELECT COUNT(*) FROM votes WHERE DATE(created_at) = CURRENT_DATE)
    ON CONFLICT (stat_date) DO UPDATE SET
        total_users = EXCLUDED.total_users,
        new_users = EXCLUDED.new_users,
        active_users = EXCLUDED.active_users,
        total_shows = EXCLUDED.total_shows,
        new_shows = EXCLUDED.new_shows,
        total_setlists = EXCLUDED.total_setlists,
        new_setlists = EXCLUDED.new_setlists,
        total_artists = EXCLUDED.total_artists,
        new_artists = EXCLUDED.new_artists,
        total_venues = EXCLUDED.total_venues,
        new_venues = EXCLUDED.new_venues,
        total_reviews = EXCLUDED.total_reviews,
        new_reviews = EXCLUDED.new_reviews,
        total_photos = EXCLUDED.total_photos,
        new_photos = EXCLUDED.new_photos,
        total_votes = EXCLUDED.total_votes,
        new_votes = EXCLUDED.new_votes;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on new tables
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
CREATE POLICY admin_all_reports ON reports
    FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'moderator')));

CREATE POLICY admin_all_moderation_logs ON moderation_logs
    FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'moderator')));

CREATE POLICY admin_all_user_bans ON user_bans
    FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

CREATE POLICY admin_all_content_moderation ON content_moderation
    FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'moderator')));

CREATE POLICY admin_all_platform_stats ON platform_stats
    FOR SELECT TO authenticated
    USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'moderator')));

CREATE POLICY admin_notifications_own ON admin_notifications
    FOR ALL TO authenticated
    USING (admin_id = auth.uid() OR auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));