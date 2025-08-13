-- Migration: Enable Row Level Security (RLS) and create policies for critical tables
-- Date: 2025-08-13
-- Description: Implements RLS policies for the 15 most critical tables to secure user data and control access

-- ================================
-- ENABLE ROW LEVEL SECURITY
-- ================================

-- User-related tables (strict user isolation)
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "votes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_follows_artists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "venue_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_activity_log" ENABLE ROW LEVEL SECURITY;

-- Public data tables (read access for all, write access controlled)
ALTER TABLE "artists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "venues" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "songs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "setlists" ENABLE ROW LEVEL SECURITY;

-- Junction tables (inherit permissions from parent tables)
ALTER TABLE "setlist_songs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "artist_songs" ENABLE ROW LEVEL SECURITY;

-- ================================
-- USER AUTHENTICATION HELPER FUNCTIONS
-- ================================

-- Helper function to get current user ID from auth.users
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT auth.uid();
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  );
$$;

-- ================================
-- RLS POLICIES FOR USER TABLES
-- ================================

-- Users table: Users can view and edit their own data only
CREATE POLICY "Users can view their own data" ON "users"
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON "users"
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role bypass for users" ON "users"
  FOR ALL USING (current_setting('role') = 'service_role');

-- User profiles: Users manage their own profiles
CREATE POLICY "Users can view their own profile" ON "user_profiles"
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON "user_profiles"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON "user_profiles"
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON "user_profiles"
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role bypass for user_profiles" ON "user_profiles"
  FOR ALL USING (current_setting('role') = 'service_role');

-- Votes: Users can only manage their own votes
CREATE POLICY "Users can view their own votes" ON "votes"
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own votes" ON "votes"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON "votes"
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON "votes"
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role bypass for votes" ON "votes"
  FOR ALL USING (current_setting('role') = 'service_role');

-- User follows artists: Users manage their own follows
CREATE POLICY "Users can view their own follows" ON "user_follows_artists"
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own follows" ON "user_follows_artists"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follows" ON "user_follows_artists"
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role bypass for user_follows_artists" ON "user_follows_artists"
  FOR ALL USING (current_setting('role') = 'service_role');

-- Venue reviews: Users manage their own reviews
CREATE POLICY "Anyone can view venue reviews" ON "venue_reviews"
  FOR SELECT TO public USING (true);

CREATE POLICY "Users can insert their own reviews" ON "venue_reviews"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON "venue_reviews"
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON "venue_reviews"
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role bypass for venue_reviews" ON "venue_reviews"
  FOR ALL USING (current_setting('role') = 'service_role');

-- Email preferences: Users manage their own email settings
CREATE POLICY "Users can view their own email preferences" ON "email_preferences"
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email preferences" ON "email_preferences"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email preferences" ON "email_preferences"
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email preferences" ON "email_preferences"
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role bypass for email_preferences" ON "email_preferences"
  FOR ALL USING (current_setting('role') = 'service_role');

-- API keys: Users manage their own API keys only
CREATE POLICY "Users can view their own API keys" ON "api_keys"
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own API keys" ON "api_keys"
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own API keys" ON "api_keys"
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own API keys" ON "api_keys"
  FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "Service role bypass for api_keys" ON "api_keys"
  FOR ALL USING (current_setting('role') = 'service_role');

-- User activity log: Users can view their own activity, admins can view all
CREATE POLICY "Users can view their own activity" ON "user_activity_log"
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity" ON "user_activity_log"
  FOR SELECT USING (auth.is_admin());

CREATE POLICY "Service role bypass for user_activity_log" ON "user_activity_log"
  FOR ALL USING (current_setting('role') = 'service_role');

-- ================================
-- RLS POLICIES FOR PUBLIC DATA TABLES
-- ================================

-- Artists: Public read access, authenticated users and admins can write
CREATE POLICY "Anyone can view artists" ON "artists"
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can insert artists" ON "artists"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update artists" ON "artists"
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete artists" ON "artists"
  FOR DELETE USING (auth.is_admin());

CREATE POLICY "Service role bypass for artists" ON "artists"
  FOR ALL USING (current_setting('role') = 'service_role');

-- Venues: Public read access, authenticated users and admins can write
CREATE POLICY "Anyone can view venues" ON "venues"
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can insert venues" ON "venues"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update venues" ON "venues"
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete venues" ON "venues"
  FOR DELETE USING (auth.is_admin());

CREATE POLICY "Service role bypass for venues" ON "venues"
  FOR ALL USING (current_setting('role') = 'service_role');

-- Shows: Public read access, authenticated users and admins can write
CREATE POLICY "Anyone can view shows" ON "shows"
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can insert shows" ON "shows"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update shows" ON "shows"
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete shows" ON "shows"
  FOR DELETE USING (auth.is_admin());

CREATE POLICY "Service role bypass for shows" ON "shows"
  FOR ALL USING (current_setting('role') = 'service_role');

-- Songs: Public read access, authenticated users and admins can write
CREATE POLICY "Anyone can view songs" ON "songs"
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can insert songs" ON "songs"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update songs" ON "songs"
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete songs" ON "songs"
  FOR DELETE USING (auth.is_admin());

CREATE POLICY "Service role bypass for songs" ON "songs"
  FOR ALL USING (current_setting('role') = 'service_role');

-- Setlists: Public read access, users can manage their own setlists
CREATE POLICY "Anyone can view setlists" ON "setlists"
  FOR SELECT TO public USING (true);

CREATE POLICY "Users can insert setlists they create" ON "setlists"
  FOR INSERT WITH CHECK (auth.uid() = created_by OR auth.is_admin());

CREATE POLICY "Users can update setlists they created" ON "setlists"
  FOR UPDATE USING (auth.uid() = created_by OR auth.is_admin());

CREATE POLICY "Users can delete setlists they created" ON "setlists"
  FOR DELETE USING (auth.uid() = created_by OR auth.is_admin());

CREATE POLICY "Service role bypass for setlists" ON "setlists"
  FOR ALL USING (current_setting('role') = 'service_role');

-- ================================
-- RLS POLICIES FOR JUNCTION TABLES
-- ================================

-- Setlist songs: Inherit permissions from setlists
CREATE POLICY "Anyone can view setlist songs" ON "setlist_songs"
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can manage setlist songs" ON "setlist_songs"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update setlist songs" ON "setlist_songs"
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete setlist songs" ON "setlist_songs"
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Service role bypass for setlist_songs" ON "setlist_songs"
  FOR ALL USING (current_setting('role') = 'service_role');

-- Artist songs: Public read, authenticated users can manage
CREATE POLICY "Anyone can view artist songs" ON "artist_songs"
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can insert artist songs" ON "artist_songs"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update artist songs" ON "artist_songs"
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete artist songs" ON "artist_songs"
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Service role bypass for artist_songs" ON "artist_songs"
  FOR ALL USING (current_setting('role') = 'service_role');

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Add indexes on user_id columns for efficient RLS policy execution
CREATE INDEX IF NOT EXISTS "idx_user_profiles_user_id" ON "user_profiles" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_votes_user_id" ON "votes" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_follows_artists_user_id" ON "user_follows_artists" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_venue_reviews_user_id" ON "venue_reviews" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_email_preferences_user_id" ON "email_preferences" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_api_keys_user_id" ON "api_keys" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_activity_log_user_id" ON "user_activity_log" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_setlists_created_by" ON "setlists" ("created_by");

-- Add index on users.role for admin checks
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role");

-- ================================
-- GRANT NECESSARY PERMISSIONS
-- ================================

-- Grant usage on auth schema functions to authenticated users
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.user_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.is_admin() TO authenticated, anon;

-- Grant SELECT permission on users table for role checking (needed for auth.is_admin())
GRANT SELECT ON "users" TO authenticated, anon;