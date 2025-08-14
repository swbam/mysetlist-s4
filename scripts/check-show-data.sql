-- Check show data in database
SELECT 
  'Total shows' as metric,
  COUNT(*) as count
FROM shows;

-- Check shows with venues
SELECT 
  'Shows with venues' as metric,
  COUNT(*) as count
FROM shows
WHERE venue_id IS NOT NULL;

-- Check upcoming shows
SELECT 
  'Upcoming shows' as metric,
  COUNT(*) as count
FROM shows
WHERE date >= CURRENT_DATE;

-- Check past shows
SELECT 
  'Past shows' as metric,
  COUNT(*) as count
FROM shows
WHERE date < CURRENT_DATE;

-- Check shows by status
SELECT 
  status,
  COUNT(*) as count
FROM shows
GROUP BY status;

-- Check shows with artists
SELECT 
  'Shows with headliner' as metric,
  COUNT(*) as count
FROM shows
WHERE headliner_artist_id IS NOT NULL;

-- Check show_artists relationships
SELECT 
  'Show-artist relationships' as metric,
  COUNT(*) as count
FROM show_artists;

-- Check recent shows
SELECT 
  s.id,
  s.name,
  s.date,
  s.status,
  a.name as artist_name,
  v.name as venue_name
FROM shows s
LEFT JOIN artists a ON s.headliner_artist_id = a.id
LEFT JOIN venues v ON s.venue_id = v.id
ORDER BY s.date DESC
LIMIT 10;

-- Check shows for top artists
SELECT 
  a.name as artist_name,
  COUNT(s.id) as show_count
FROM artists a
LEFT JOIN shows s ON s.headliner_artist_id = a.id
WHERE a.trending_score > 0
GROUP BY a.id, a.name
ORDER BY a.trending_score DESC
LIMIT 10;
