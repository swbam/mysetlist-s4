-- Row Level Security Policies

-- Users table policies
CREATE POLICY "Users can view all public user profiles" ON users
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- User profiles policies
CREATE POLICY "Anyone can view public profiles" ON user_profiles
    FOR SELECT TO authenticated
    USING (is_public = true);

CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Votes policies
CREATE POLICY "Users can view all votes" ON votes
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can insert their own votes" ON votes
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own votes" ON votes
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own votes" ON votes
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Setlists policies
CREATE POLICY "Anyone can view public setlists" ON setlists
    FOR SELECT TO authenticated
    USING (is_locked = false OR created_by = auth.uid());

CREATE POLICY "Users can create setlists" ON setlists
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own setlists" ON setlists
    FOR UPDATE TO authenticated
    USING (created_by = auth.uid() OR auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'moderator')));

CREATE POLICY "Users can delete their own setlists" ON setlists
    FOR DELETE TO authenticated
    USING (created_by = auth.uid() OR auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'moderator')));

-- Email preferences policies (new)
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email preferences" ON email_preferences
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own email preferences" ON email_preferences
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own email preferences" ON email_preferences
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Email unsubscribes policies (new)
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own unsubscribes" ON email_unsubscribes
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own unsubscribes" ON email_unsubscribes
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Email queue policies (admin only)
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view email queue" ON email_queue
    FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- Email logs policies
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email logs" ON email_logs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- Venue reviews policies (new)
ALTER TABLE venue_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved reviews" ON venue_reviews
    FOR SELECT TO authenticated
    USING (moderation_status = 'approved' OR user_id = auth.uid());

CREATE POLICY "Users can create reviews" ON venue_reviews
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reviews" ON venue_reviews
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews" ON venue_reviews
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Venue photos policies (new)
ALTER TABLE venue_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved photos" ON venue_photos
    FOR SELECT TO authenticated
    USING (moderation_status = 'approved' OR user_id = auth.uid());

CREATE POLICY "Users can upload photos" ON venue_photos
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own photos" ON venue_photos
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Venue insider tips policies (new)
ALTER TABLE venue_insider_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved tips" ON venue_insider_tips
    FOR SELECT TO authenticated
    USING (moderation_status = 'approved' OR user_id = auth.uid());

CREATE POLICY "Users can create tips" ON venue_insider_tips
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tips" ON venue_insider_tips
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own tips" ON venue_insider_tips
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- User follows artists policies (new)
ALTER TABLE user_follows_artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows" ON user_follows_artists
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can follow artists" ON user_follows_artists
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unfollow artists" ON user_follows_artists
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());