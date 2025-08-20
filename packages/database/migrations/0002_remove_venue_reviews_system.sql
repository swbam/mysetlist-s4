-- Remove venue reviews, insider tips, and photos system
-- This migration removes all review and photo functionality for venues

-- Drop foreign key constraints first
DO $$ BEGIN
  -- Drop foreign key constraints for venue_reviews
  ALTER TABLE "venue_reviews" DROP CONSTRAINT IF EXISTS "venue_reviews_venue_id_venues_id_fk";
  ALTER TABLE "venue_reviews" DROP CONSTRAINT IF EXISTS "venue_reviews_user_id_users_id_fk";
  
  -- Drop foreign key constraints for venue_insider_tips  
  ALTER TABLE "venue_insider_tips" DROP CONSTRAINT IF EXISTS "venue_insider_tips_venue_id_venues_id_fk";
  ALTER TABLE "venue_insider_tips" DROP CONSTRAINT IF EXISTS "venue_insider_tips_user_id_users_id_fk";
  
  -- Drop foreign key constraints for venue_photos
  ALTER TABLE "venue_photos" DROP CONSTRAINT IF EXISTS "venue_photos_venue_id_venues_id_fk";
  ALTER TABLE "venue_photos" DROP CONSTRAINT IF EXISTS "venue_photos_user_id_users_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

-- Drop the tables
DROP TABLE IF EXISTS "venue_reviews";
DROP TABLE IF EXISTS "venue_insider_tips";
DROP TABLE IF EXISTS "venue_photos";

-- Remove average_rating column from venues table
ALTER TABLE "venues" DROP COLUMN IF EXISTS "average_rating";

-- Update platform_stats table to remove review/photo columns if they exist
ALTER TABLE "platform_stats" DROP COLUMN IF EXISTS "new_reviews";
ALTER TABLE "platform_stats" DROP COLUMN IF EXISTS "new_photos";

-- Clean up any remaining references in other tables (if needed)
-- This ensures data consistency after removing the venue review system