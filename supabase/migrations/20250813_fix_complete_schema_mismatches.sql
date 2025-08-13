-- Migration: Fix Complete Schema Mismatches for TheSet
-- This migration fixes all schema inconsistencies found in the database

-- 1. Fix songs search index (references non-existent 'name' field)
DROP INDEX IF EXISTS idx_songs_search;
CREATE INDEX IF NOT EXISTS idx_songs_search ON songs USING gin(to_tsvector('english', title));

-- 2. Remove bio field completely from artists table
ALTER TABLE artists DROP COLUMN IF EXISTS bio CASCADE;

-- 3. Remove bio from search indexes
DROP INDEX IF EXISTS idx_artists_search CASCADE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_search_clean 
ON artists USING gin((name || ' ' || COALESCE(genres, '')) gin_trgm_ops);

-- 4. Add missing artist historical tracking fields
ALTER TABLE artists 
ADD COLUMN IF NOT EXISTS previous_followers integer,
ADD COLUMN IF NOT EXISTS previous_popularity integer,
ADD COLUMN IF NOT EXISTS previous_monthly_listeners integer,
ADD COLUMN IF NOT EXISTS previous_follower_count integer,
ADD COLUMN IF NOT EXISTS last_growth_calculated timestamp;

-- 5. Add missing venue fields
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS ticketmaster_id text UNIQUE,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS venue_type text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS amenities text,
ADD COLUMN IF NOT EXISTS total_shows integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS upcoming_shows integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_attendance integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating double precision,
ADD COLUMN IF NOT EXISTS previous_total_shows integer,
ADD COLUMN IF NOT EXISTS previous_upcoming_shows integer,
ADD COLUMN IF NOT EXISTS previous_total_attendance integer,
ADD COLUMN IF NOT EXISTS last_growth_calculated timestamp;

-- 6. Add missing shows historical tracking fields
ALTER TABLE shows
ADD COLUMN IF NOT EXISTS previous_view_count integer,
ADD COLUMN IF NOT EXISTS previous_attendee_count integer,
ADD COLUMN IF NOT EXISTS previous_vote_count integer,
ADD COLUMN IF NOT EXISTS previous_setlist_count integer,
ADD COLUMN IF NOT EXISTS last_growth_calculated timestamp;

-- 7. Fix voting system - align with simplified upvote-only system
-- Remove vote_type if it exists (from old schema)
ALTER TABLE votes DROP COLUMN IF EXISTS vote_type CASCADE;
DROP TYPE IF EXISTS vote_type_enum CASCADE;

-- 8. Ensure setlist_songs matches simplified voting (no downvotes)
ALTER TABLE setlist_songs DROP COLUMN IF EXISTS downvotes CASCADE;
ALTER TABLE setlist_songs DROP COLUMN IF EXISTS net_votes CASCADE;

-- 9. Fix setlists table to match code expectations
ALTER TABLE setlists 
ADD COLUMN IF NOT EXISTS artist_id uuid REFERENCES artists(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS type text DEFAULT 'predicted',
ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- Update type column to have proper constraint
ALTER TABLE setlists DROP CONSTRAINT IF EXISTS setlists_type_check;
ALTER TABLE setlists ADD CONSTRAINT setlists_type_check 
CHECK (type IN ('predicted', 'actual', 'custom', 'user'));

-- 10. Create missing performance indexes
CREATE INDEX IF NOT EXISTS idx_artists_trending ON artists(trending_score DESC) WHERE trending_score > 0;
CREATE INDEX IF NOT EXISTS idx_shows_trending ON shows(trending_score DESC) WHERE trending_score > 0;
CREATE INDEX IF NOT EXISTS idx_venues_location ON venues(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artists_ticketmaster_id ON artists(ticketmaster_id) WHERE ticketmaster_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artists_spotify_id ON artists(spotify_id) WHERE spotify_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_songs_spotify_id ON songs(spotify_id) WHERE spotify_id IS NOT NULL;

-- 11. Ensure artist_songs has proper constraints
ALTER TABLE artist_songs 
ADD COLUMN IF NOT EXISTS is_primary_artist boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- 12. Fix artist_stats to ensure all fields exist
ALTER TABLE artist_stats
ADD COLUMN IF NOT EXISTS total_songs integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_shows integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS upcoming_shows integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_votes integer DEFAULT 0;

-- 13. Add missing fields to songs table for better catalog management
ALTER TABLE songs
ADD COLUMN IF NOT EXISTS is_live boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_acoustic boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_remix boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_cover boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS original_artist text;

-- 14. Ensure user_profiles doesn't have bio field
ALTER TABLE user_profiles DROP COLUMN IF EXISTS bio CASCADE;

-- 15. Add import status tracking table if missing
CREATE TABLE IF NOT EXISTS import_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid REFERENCES artists(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  stage text,
  percentage integer DEFAULT 0,
  message text,
  details jsonb,
  error text,
  started_at timestamp DEFAULT NOW(),
  completed_at timestamp,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_status_artist ON import_status(artist_id);
CREATE INDEX IF NOT EXISTS idx_import_status_created ON import_status(created_at DESC);

-- 16. Update all cron job functions to use theset.live domain
UPDATE cron_job_logs SET details = jsonb_set(
  COALESCE(details, '{}'::jsonb),
  '{domain}',
  '"theset.live"'::jsonb
) WHERE details->>'domain' = 'mysetlist.com' OR details->>'domain' IS NULL;

-- Add a comment to track migration completion
COMMENT ON SCHEMA public IS 'TheSet database schema - migration completed on 2025-08-13';