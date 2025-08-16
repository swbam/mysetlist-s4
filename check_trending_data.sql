-- Check for artists with trending scores
SELECT 
  id, 
  name, 
  trending_score, 
  popularity, 
  follower_count,
  last_synced_at,
  updated_at
FROM artists 
WHERE trending_score > 0 
ORDER BY trending_score DESC 
LIMIT 10;

-- Check total count of artists with trending scores
SELECT COUNT(*) as artists_with_trending_scores 
FROM artists 
WHERE trending_score > 0;

-- Check recent artist updates
SELECT 
  name, 
  trending_score, 
  updated_at,
  last_synced_at
FROM artists 
WHERE updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC 
LIMIT 5;
