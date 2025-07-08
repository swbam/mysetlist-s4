-- Add foreign key constraints for tables that might be missing them

-- Ensure artist_stats has proper foreign key to artists
ALTER TABLE artist_stats 
  DROP CONSTRAINT IF EXISTS artist_stats_artist_id_fkey,
  ADD CONSTRAINT artist_stats_artist_id_fkey 
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE;

-- Ensure show_comments has proper foreign keys
ALTER TABLE show_comments 
  DROP CONSTRAINT IF EXISTS show_comments_show_id_fkey,
  ADD CONSTRAINT show_comments_show_id_fkey 
    FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;

ALTER TABLE show_comments 
  DROP CONSTRAINT IF EXISTS show_comments_user_id_fkey,
  ADD CONSTRAINT show_comments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE show_comments 
  DROP CONSTRAINT IF EXISTS show_comments_parent_id_fkey,
  ADD CONSTRAINT show_comments_parent_id_fkey 
    FOREIGN KEY (parent_id) REFERENCES show_comments(id) ON DELETE CASCADE;

-- Ensure venue_tips has proper foreign keys
ALTER TABLE venue_tips 
  DROP CONSTRAINT IF EXISTS venue_tips_venue_id_fkey,
  ADD CONSTRAINT venue_tips_venue_id_fkey 
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE;

ALTER TABLE venue_tips 
  DROP CONSTRAINT IF EXISTS venue_tips_user_id_fkey,
  ADD CONSTRAINT venue_tips_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Ensure venue_photos has proper foreign keys
ALTER TABLE venue_photos 
  DROP CONSTRAINT IF EXISTS venue_photos_venue_id_fkey,
  ADD CONSTRAINT venue_photos_venue_id_fkey 
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE;

ALTER TABLE venue_photos 
  DROP CONSTRAINT IF EXISTS venue_photos_user_id_fkey,
  ADD CONSTRAINT venue_photos_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Ensure venue_insider_tips has proper foreign keys
ALTER TABLE venue_insider_tips 
  DROP CONSTRAINT IF EXISTS venue_insider_tips_venue_id_fkey,
  ADD CONSTRAINT venue_insider_tips_venue_id_fkey 
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE;

ALTER TABLE venue_insider_tips 
  DROP CONSTRAINT IF EXISTS venue_insider_tips_user_id_fkey,
  ADD CONSTRAINT venue_insider_tips_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Ensure email tables have proper foreign keys
ALTER TABLE email_preferences 
  DROP CONSTRAINT IF EXISTS email_preferences_user_id_fkey,
  ADD CONSTRAINT email_preferences_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE email_unsubscribes 
  DROP CONSTRAINT IF EXISTS email_unsubscribes_user_id_fkey,
  ADD CONSTRAINT email_unsubscribes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE email_queue 
  DROP CONSTRAINT IF EXISTS email_queue_user_id_fkey,
  ADD CONSTRAINT email_queue_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE email_logs 
  DROP CONSTRAINT IF EXISTS email_logs_user_id_fkey,
  ADD CONSTRAINT email_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes for foreign keys if not exists
CREATE INDEX IF NOT EXISTS idx_artist_stats_artist_id ON artist_stats(artist_id);
CREATE INDEX IF NOT EXISTS idx_show_comments_show_id ON show_comments(show_id);
CREATE INDEX IF NOT EXISTS idx_show_comments_user_id ON show_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_show_comments_parent_id ON show_comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_venue_tips_venue_id ON venue_tips(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_tips_user_id ON venue_tips(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_photos_venue_id ON venue_photos(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_photos_user_id ON venue_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_insider_tips_venue_id ON venue_insider_tips(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_insider_tips_user_id ON venue_insider_tips(user_id);
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_user_id ON email_unsubscribes(user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_user_id ON email_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);