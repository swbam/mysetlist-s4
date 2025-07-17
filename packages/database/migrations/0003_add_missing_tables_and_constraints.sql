-- Missing Tables and Constraints Migration
-- This migration adds any missing tables and ensures data integrity

-- ============================================================================
-- MISSING TABLES
-- ============================================================================

-- User authentication tokens table (if not exists from auth package)
CREATE TABLE IF NOT EXISTS user_auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'spotify', 'google', 'apple'
    provider_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(20) DEFAULT 'Bearer',
    scope TEXT, -- JSON array of scopes
    expires_at TIMESTAMP,
    provider_profile TEXT, -- JSON string
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_used_at TIMESTAMP
);

-- User followed artists table (enhanced version)
CREATE TABLE IF NOT EXISTS user_followed_artists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artist_id TEXT NOT NULL, -- Spotify artist ID
    artist_name TEXT NOT NULL,
    artist_image TEXT,
    notify_new_shows BOOLEAN DEFAULT true NOT NULL,
    notify_setlist_updates BOOLEAN DEFAULT true NOT NULL,
    followed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    unfollowed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- User music preferences table
CREATE TABLE IF NOT EXISTS user_music_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    favorite_genres TEXT, -- JSON array
    top_artists TEXT, -- JSON array of Spotify artist data
    top_tracks TEXT, -- JSON array of Spotify track data
    preferred_venues TEXT, -- JSON array
    notification_radius INTEGER DEFAULT 50, -- km
    enable_personalized_recommendations BOOLEAN DEFAULT true,
    include_spotify_data BOOLEAN DEFAULT true,
    last_spotify_sync TIMESTAMP,
    auto_sync_spotify BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Show attendance tracking
CREATE TABLE IF NOT EXISTS show_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'going', -- 'going', 'interested', 'not_going'
    attended BOOLEAN,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    photos TEXT[], -- Array of photo URLs
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, show_id)
);

-- Setlist predictions and accuracy tracking
CREATE TABLE IF NOT EXISTS setlist_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    predicted_setlist TEXT NOT NULL, -- JSON array of song predictions
    confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    actual_accuracy NUMERIC(3,2), -- Calculated after show
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Song play history for shows
CREATE TABLE IF NOT EXISTS song_play_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    set_name VARCHAR(100) DEFAULT 'Main Set',
    played_at TIMESTAMP,
    duration_seconds INTEGER,
    notes TEXT,
    is_encore BOOLEAN DEFAULT false,
    is_cover BOOLEAN DEFAULT false,
    original_artist TEXT, -- For covers
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(show_id, position, set_name)
);

-- User notifications
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'new_show', 'setlist_update', 'artist_news', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional notification data
    read BOOLEAN DEFAULT false,
    action_url TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Artist social media and external links
CREATE TABLE IF NOT EXISTS artist_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'spotify', 'instagram', 'twitter', 'website', etc.
    url TEXT NOT NULL,
    verified BOOLEAN DEFAULT false,
    follower_count INTEGER,
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Venue amenities and features
CREATE TABLE IF NOT EXISTS venue_amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    amenity_type VARCHAR(50) NOT NULL, -- 'parking', 'food', 'accessibility', etc.
    name TEXT NOT NULL,
    description TEXT,
    available BOOLEAN DEFAULT true,
    cost_info TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Song lyrics and metadata
CREATE TABLE IF NOT EXISTS song_lyrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE UNIQUE,
    lyrics TEXT,
    language VARCHAR(10) DEFAULT 'en',
    source VARCHAR(50), -- 'genius', 'musixmatch', 'manual'
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- User-generated content moderation
CREATE TABLE IF NOT EXISTS content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content_type VARCHAR(50) NOT NULL, -- 'comment', 'review', 'photo', etc.
    content_id UUID NOT NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
    moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    moderator_notes TEXT,
    action_taken VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- ENHANCED CONSTRAINTS AND VALIDATIONS
-- ============================================================================

-- Add check constraints for data integrity
ALTER TABLE shows ADD CONSTRAINT check_show_dates 
    CHECK (date >= '2000-01-01' AND date <= '2100-12-31');

ALTER TABLE shows ADD CONSTRAINT check_show_times
    CHECK (start_time IS NULL OR (start_time >= '00:00:00' AND start_time <= '23:59:59'));

ALTER TABLE shows ADD CONSTRAINT check_ticket_prices
    CHECK (min_price IS NULL OR min_price >= 0);

ALTER TABLE shows ADD CONSTRAINT check_max_price_greater_than_min
    CHECK (max_price IS NULL OR min_price IS NULL OR max_price >= min_price);

-- Venue constraints
ALTER TABLE venues ADD CONSTRAINT check_venue_coordinates
    CHECK ((latitude IS NULL AND longitude IS NULL) OR 
           (latitude IS NOT NULL AND longitude IS NOT NULL AND
            latitude >= -90 AND latitude <= 90 AND
            longitude >= -180 AND longitude <= 180));

ALTER TABLE venues ADD CONSTRAINT check_venue_capacity
    CHECK (capacity IS NULL OR capacity > 0);

-- Song constraints
ALTER TABLE songs ADD CONSTRAINT check_song_duration
    CHECK (duration_ms IS NULL OR duration_ms > 0);

ALTER TABLE songs ADD CONSTRAINT check_song_popularity
    CHECK (popularity >= 0 AND popularity <= 100);

-- Vote constraints
ALTER TABLE setlist_songs ADD CONSTRAINT check_vote_counts
    CHECK (upvotes >= 0 AND downvotes >= 0);

-- User profile constraints
ALTER TABLE user_profiles ADD CONSTRAINT check_profile_counts
    CHECK (shows_attended >= 0 AND songs_voted >= 0 AND artists_followed >= 0);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS (if missing)
-- ============================================================================

-- Ensure all foreign keys exist with proper cascading
DO $
BEGIN
    -- Add missing foreign key constraints if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'artist_songs_artist_id_fkey'
    ) THEN
        ALTER TABLE artist_songs 
        ADD CONSTRAINT artist_songs_artist_id_fkey 
        FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'artist_songs_song_id_fkey'
    ) THEN
        ALTER TABLE artist_songs 
        ADD CONSTRAINT artist_songs_song_id_fkey 
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE;
    END IF;

    -- Add other missing foreign keys as needed
END;
$;

-- ============================================================================
-- INDEXES FOR NEW TABLES
-- ============================================================================

-- User auth tokens indexes
CREATE INDEX IF NOT EXISTS idx_user_auth_tokens_user_provider ON user_auth_tokens(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_user_auth_tokens_active ON user_auth_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_auth_tokens_expires ON user_auth_tokens(expires_at) WHERE expires_at IS NOT NULL;

-- User followed artists indexes
CREATE INDEX IF NOT EXISTS idx_user_followed_artists_user ON user_followed_artists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_followed_artists_active ON user_followed_artists(is_active) WHERE is_active = true;

-- Show attendance indexes
CREATE INDEX IF NOT EXISTS idx_show_attendance_user ON show_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_show_attendance_show ON show_attendance(show_id);
CREATE INDEX IF NOT EXISTS idx_show_attendance_status ON show_attendance(status);

-- User notifications indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread ON user_notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_expires ON user_notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Song play history indexes
CREATE INDEX IF NOT EXISTS idx_song_play_history_show ON song_play_history(show_id);
CREATE INDEX IF NOT EXISTS idx_song_play_history_song ON song_play_history(song_id);
CREATE INDEX IF NOT EXISTS idx_song_play_history_artist ON song_play_history(artist_id);

-- ============================================================================
-- TRIGGERS FOR NEW TABLES
-- ============================================================================

-- Update user_profiles.artists_followed when user_followed_artists changes
CREATE OR REPLACE FUNCTION update_user_artists_followed_count()
RETURNS TRIGGER AS $
DECLARE
    user_id_val UUID;
    count_val INTEGER;
BEGIN
    user_id_val := COALESCE(NEW.user_id, OLD.user_id);
    
    SELECT COUNT(*) INTO count_val
    FROM user_followed_artists
    WHERE user_id = user_id_val AND is_active = true;
    
    UPDATE user_profiles
    SET artists_followed = count_val, updated_at = NOW()
    WHERE user_id = user_id_val;
    
    RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_artists_followed
    AFTER INSERT OR UPDATE OR DELETE ON user_followed_artists
    FOR EACH ROW
    EXECUTE FUNCTION update_user_artists_followed_count();

-- Update show attendance count
CREATE OR REPLACE FUNCTION update_show_attendance_count()
RETURNS TRIGGER AS $
DECLARE
    show_id_val UUID;
    count_val INTEGER;
BEGIN
    show_id_val := COALESCE(NEW.show_id, OLD.show_id);
    
    SELECT COUNT(*) INTO count_val
    FROM show_attendance
    WHERE show_id = show_id_val AND status = 'going';
    
    UPDATE shows
    SET attendee_count = count_val, updated_at = NOW()
    WHERE id = show_id_val;
    
    RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_show_attendance
    AFTER INSERT OR UPDATE OR DELETE ON show_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_show_attendance_count();

-- ============================================================================
-- DATA VALIDATION FUNCTIONS
-- ============================================================================

-- Function to validate email addresses
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate URLs
CREATE OR REPLACE FUNCTION is_valid_url(url TEXT)
RETURNS BOOLEAN AS $
BEGIN
    RETURN url ~* '^https?://[^\s/$.?#].[^\s]*$';
END;
$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate Spotify IDs
CREATE OR REPLACE FUNCTION is_valid_spotify_id(spotify_id TEXT)
RETURNS BOOLEAN AS $
BEGIN
    RETURN spotify_id ~* '^[0-9A-Za-z]{22}$';
END;
$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to get user's followed artists
CREATE OR REPLACE FUNCTION get_user_followed_artists(p_user_id UUID)
RETURNS TABLE(
    artist_id TEXT,
    artist_name TEXT,
    artist_image TEXT,
    followed_at TIMESTAMP
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        ufa.artist_id,
        ufa.artist_name,
        ufa.artist_image,
        ufa.followed_at
    FROM user_followed_artists ufa
    WHERE ufa.user_id = p_user_id 
    AND ufa.is_active = true
    ORDER BY ufa.followed_at DESC;
END;
$ LANGUAGE plpgsql;

-- Function to get trending shows for user's followed artists
CREATE OR REPLACE FUNCTION get_trending_shows_for_user(p_user_id UUID)
RETURNS TABLE(
    show_id UUID,
    show_name TEXT,
    show_date DATE,
    artist_name TEXT,
    venue_name TEXT,
    trending_score NUMERIC
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.date,
        a.name,
        v.name,
        s.trending_score
    FROM shows s
    JOIN artists a ON s.headliner_artist_id = a.id
    LEFT JOIN venues v ON s.venue_id = v.id
    WHERE EXISTS (
        SELECT 1 FROM user_followed_artists ufa
        WHERE ufa.user_id = p_user_id 
        AND ufa.artist_id = a.spotify_id
        AND ufa.is_active = true
    )
    AND s.status = 'upcoming'
    AND s.date >= CURRENT_DATE
    ORDER BY s.trending_score DESC, s.date ASC
    LIMIT 50;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP AND MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_auth_tokens 
    WHERE expires_at < NOW() AND expires_at IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO admin_notifications (type, title, message, severity)
    VALUES ('maintenance', 'Token Cleanup', 
            format('Cleaned up %s expired authentication tokens', deleted_count), 'low');
    
    RETURN deleted_count;
END;
$ LANGUAGE plpgsql;

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_notifications 
    WHERE (expires_at < NOW() AND expires_at IS NOT NULL)
    OR (read = true AND created_at < NOW() - INTERVAL '30 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO admin_notifications (type, title, message, severity)
    VALUES ('maintenance', 'Notification Cleanup', 
            format('Cleaned up %s old notifications', deleted_count), 'low');
    
    RETURN deleted_count;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE user_auth_tokens IS 'Stores OAuth tokens for external service integrations';
COMMENT ON TABLE user_followed_artists IS 'Tracks which artists users follow for notifications';
COMMENT ON TABLE user_music_preferences IS 'Stores user music preferences synced from Spotify';
COMMENT ON TABLE show_attendance IS 'Tracks user attendance and reviews for shows';
COMMENT ON TABLE setlist_predictions IS 'User predictions for show setlists with accuracy tracking';
COMMENT ON TABLE song_play_history IS 'Historical record of songs played at shows';
COMMENT ON TABLE user_notifications IS 'User notifications for followed artists and shows';
COMMENT ON TABLE artist_links IS 'Social media and external links for artists';
COMMENT ON TABLE venue_amenities IS 'Detailed amenities and features available at venues';
COMMENT ON TABLE song_lyrics IS 'Song lyrics and metadata';
COMMENT ON TABLE content_reports IS 'User reports for inappropriate content moderation';

COMMENT ON FUNCTION get_user_followed_artists(UUID) IS 'Returns list of artists followed by a user';
COMMENT ON FUNCTION get_trending_shows_for_user(UUID) IS 'Returns trending shows for artists followed by a user';
COMMENT ON FUNCTION cleanup_expired_tokens() IS 'Removes expired authentication tokens';
COMMENT ON FUNCTION cleanup_old_notifications() IS 'Removes old and expired user notifications';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $
BEGIN
    RAISE NOTICE 'Missing tables and constraints migration completed successfully!';
    RAISE NOTICE 'Added user authentication, music preferences, attendance tracking, and more.';
    RAISE NOTICE 'Enhanced data integrity with constraints and validation functions.';
END;
$;