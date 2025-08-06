-- Add missing columns to shows table
ALTER TABLE shows 
ADD COLUMN IF NOT EXISTS previous_view_count INTEGER,
ADD COLUMN IF NOT EXISTS previous_attendee_count INTEGER,
ADD COLUMN IF NOT EXISTS previous_vote_count INTEGER,
ADD COLUMN IF NOT EXISTS previous_setlist_count INTEGER,
ADD COLUMN IF NOT EXISTS last_growth_calculated TIMESTAMP;

-- Update any null values to 0 for consistency
UPDATE shows 
SET 
  previous_view_count = COALESCE(previous_view_count, 0),
  previous_attendee_count = COALESCE(previous_attendee_count, 0),
  previous_vote_count = COALESCE(previous_vote_count, 0),
  previous_setlist_count = COALESCE(previous_setlist_count, 0)
WHERE 
  previous_view_count IS NULL 
  OR previous_attendee_count IS NULL 
  OR previous_vote_count IS NULL 
  OR previous_setlist_count IS NULL;