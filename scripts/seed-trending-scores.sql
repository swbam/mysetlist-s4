-- Seed trending scores for immediate functionality
-- Run this script to populate initial trending scores

-- Update artists trending scores based on popularity and followers
UPDATE artists 
SET trending_score = CASE 
  WHEN popularity IS NOT NULL AND followers IS NOT NULL THEN
    ROUND((popularity * 0.3 + (followers / 1000.0) * 0.4 + COALESCE(follower_count, 0) / 100.0 * 0.3)::numeric, 2)
  WHEN popularity IS NOT NULL THEN
    ROUND((popularity * 0.7)::numeric, 2)
  WHEN followers IS NOT NULL THEN
    ROUND((followers / 1000.0 * 0.8)::numeric, 2)
  ELSE
    ROUND((RANDOM() * 50 + 10)::numeric, 2)
END
WHERE trending_score = 0 OR trending_score IS NULL;

-- Update shows trending scores based on view count, vote count, and attendee count
UPDATE shows 
SET trending_score = CASE 
  WHEN view_count IS NOT NULL OR vote_count IS NOT NULL OR attendee_count IS NOT NULL THEN
    ROUND((COALESCE(view_count, 0) * 0.2 + COALESCE(vote_count, 0) * 0.5 + COALESCE(attendee_count, 0) * 0.3)::numeric, 2)
  ELSE
    ROUND((RANDOM() * 100 + 20)::numeric, 2)
END
WHERE trending_score = 0 OR trending_score IS NULL;

-- Note: Venues table doesn't have trending_score or show_count columns
-- Instead, we'll focus on making sure shows have proper venue associations
-- and the shows themselves have good trending scores

-- Add some simulated recent activity for better trending data
UPDATE artists 
SET 
  last_synced_at = NOW() - (RANDOM() * INTERVAL '7 days'),
  updated_at = NOW() - (RANDOM() * INTERVAL '48 hours')
WHERE last_synced_at IS NULL;

-- Update shows with some simulated view counts for better trending
UPDATE shows 
SET 
  view_count = FLOOR(RANDOM() * 1000 + 50)::int,
  vote_count = FLOOR(RANDOM() * 200 + 10)::int,
  updated_at = NOW() - (RANDOM() * INTERVAL '48 hours')
WHERE view_count = 0 OR view_count IS NULL;

-- Ensure some shows are very recent for "live" trending
UPDATE shows 
SET updated_at = NOW() - (RANDOM() * INTERVAL '2 hours')
WHERE id IN (
  SELECT id FROM shows 
  WHERE trending_score > 0 
  ORDER BY RANDOM() 
  LIMIT 20
);

-- Recalculate trending scores after updating view counts
UPDATE shows 
SET trending_score = ROUND((COALESCE(view_count, 0) * 0.2 + COALESCE(vote_count, 0) * 0.5 + COALESCE(attendee_count, 0) * 0.3)::numeric, 2);

-- Create some indexes for better performance on trending queries
CREATE INDEX IF NOT EXISTS idx_artists_trending_score ON artists (trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_shows_trending_score ON shows (trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_artists_last_synced ON artists (last_synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_shows_updated_at ON shows (updated_at DESC);

-- Verify the results
SELECT 'Artists with trending scores' as table_name, COUNT(*) as count 
FROM artists WHERE trending_score > 0
UNION ALL
SELECT 'Shows with trending scores', COUNT(*) 
FROM shows WHERE trending_score > 0
UNION ALL
SELECT 'Shows with votes', COUNT(*) 
FROM shows WHERE vote_count > 0; 