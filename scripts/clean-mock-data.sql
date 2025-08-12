-- Clean all mock/seed data from database
-- Only keep real data imported through sync system

-- First, delete all setlist songs for mock setlists
DELETE FROM setlist_songs 
WHERE setlist_id IN (
  SELECT id FROM setlists 
  WHERE name LIKE '%Predicted%' 
  OR created_by_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

-- Delete mock setlists
DELETE FROM setlists 
WHERE name LIKE '%Predicted%' 
OR created_by_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
OR id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Delete mock songs (Electric Love and other test songs)
DELETE FROM songs 
WHERE name = 'Electric Love' 
OR name = 'Love Story'
OR artist_name IN ('Drake', 'Bad Bunny', 'Dua Lipa', 'The Weeknd', 'Post Malone', 'Billie Eilish', 'Arctic Monkeys', 'Olivia Rodrigo')
OR album_name = 'Album 2';

-- Delete shows that don't have real Ticketmaster IDs
DELETE FROM shows 
WHERE ticketmaster_id IS NULL 
OR ticketmaster_id = ''
OR name LIKE '%Eras Tour%';

-- Delete artists without Spotify or Ticketmaster IDs (mock artists)
DELETE FROM artists 
WHERE (spotify_id IS NULL OR spotify_id = '') 
AND (ticketmaster_id IS NULL OR ticketmaster_id = '');

-- Reset all trending scores to 0 (will be recalculated from real data)
UPDATE artists SET trending_score = 0;
UPDATE shows SET trending_score = 0;

-- Clean up any orphaned data
DELETE FROM votes WHERE setlist_song_id NOT IN (SELECT id FROM setlist_songs);
DELETE FROM user_follows_artists WHERE artist_id NOT IN (SELECT id FROM artists);
DELETE FROM artist_stats WHERE artist_id NOT IN (SELECT id FROM artists);

-- Verify what's left
SELECT 'Artists remaining:' as info, COUNT(*) as count FROM artists WHERE spotify_id IS NOT NULL OR ticketmaster_id IS NOT NULL;
SELECT 'Shows remaining:' as info, COUNT(*) as count FROM shows WHERE ticketmaster_id IS NOT NULL;
SELECT 'Songs remaining:' as info, COUNT(*) as count FROM songs;
SELECT 'Setlists remaining:' as info, COUNT(*) as count FROM setlists;