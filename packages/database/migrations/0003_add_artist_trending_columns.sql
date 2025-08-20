-- Add missing trending-related columns to artists table
-- This migration adds columns needed by the trending calculation processor

-- Add view_count column to track page views
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "view_count" integer DEFAULT 0;

-- Add is_trending column to mark currently trending artists  
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "is_trending" boolean DEFAULT false;

-- Add trending_updated_at column to track when trending status was last updated
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "trending_updated_at" timestamp;

-- Create index on trending columns for better query performance
CREATE INDEX IF NOT EXISTS "idx_artists_trending" ON "artists" ("is_trending", "trending_score");
CREATE INDEX IF NOT EXISTS "idx_artists_view_count" ON "artists" ("view_count");

-- Update existing artists to have proper default values
UPDATE "artists" SET 
  "view_count" = 0,
  "is_trending" = false
WHERE "view_count" IS NULL OR "is_trending" IS NULL;