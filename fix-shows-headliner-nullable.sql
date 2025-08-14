-- Make headliner_artist_id nullable to allow venue-only shows
-- This enables importing shows even when artist matching fails

ALTER TABLE shows 
  ALTER COLUMN headliner_artist_id DROP NOT NULL;