-- Enable Row Level Security on all tables that don't have it yet
-- Generated automatically based on table audit

-- Core user data tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_show_attendance ENABLE ROW LEVEL SECURITY;

-- Artist and show data tables  
ALTER TABLE artist_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_comments ENABLE ROW LEVEL SECURITY;

-- Setlist and voting tables
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Venue related tables
ALTER TABLE venue_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_insider_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_reviews ENABLE ROW LEVEL SECURITY;

-- Email system tables
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access on core data
CREATE POLICY "Public can view artists" ON artists FOR SELECT USING (true);
CREATE POLICY "Public can view shows" ON shows FOR SELECT USING (true);
CREATE POLICY "Public can view venues" ON venues FOR SELECT USING (true);
CREATE POLICY "Public can view setlists" ON setlists FOR SELECT USING (true);
CREATE POLICY "Public can view setlist_songs" ON setlist_songs FOR SELECT USING (true);
CREATE POLICY "Public can view songs" ON songs FOR SELECT USING (true);
CREATE POLICY "Public can view artist_stats" ON artist_stats FOR SELECT USING (true);
CREATE POLICY "Public can view show_artists" ON show_artists FOR SELECT USING (true);

-- User-specific data policies
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own attendance" ON user_show_attendance
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own attendance" ON user_show_attendance
  FOR ALL USING (auth.uid() = user_id);

-- Voting policies
CREATE POLICY "Users can view all votes" ON votes FOR SELECT USING (true);
CREATE POLICY "Users can create votes" ON votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own votes" ON votes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own votes" ON votes
  FOR DELETE USING (auth.uid() = user_id);

-- Comment policies  
CREATE POLICY "Anyone can view comments" ON show_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON show_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON show_comments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON show_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Venue content policies
CREATE POLICY "Anyone can view venue tips" ON venue_tips FOR SELECT USING (true);
CREATE POLICY "Users can create venue tips" ON venue_tips
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own venue tips" ON venue_tips
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view venue reviews" ON venue_reviews FOR SELECT USING (true);
CREATE POLICY "Users can create venue reviews" ON venue_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own venue reviews" ON venue_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view venue photos" ON venue_photos FOR SELECT USING (true);
CREATE POLICY "Users can create venue photos" ON venue_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view venue insider tips" ON venue_insider_tips FOR SELECT USING (true);
CREATE POLICY "Users can create venue insider tips" ON venue_insider_tips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Email privacy policies
CREATE POLICY "Users can view their own email logs" ON email_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own email preferences" ON email_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own email preferences" ON email_preferences
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own email queue" ON email_queue
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own email unsubscribes" ON email_unsubscribes
  FOR SELECT USING (auth.uid() = user_id);

-- Admin policies for users table
CREATE POLICY "Users can view their own user record" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own user record" ON users
  FOR UPDATE USING (auth.uid() = id); 