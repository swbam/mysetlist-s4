-- Clean all mock/seed data from database
-- Only keep real data imported through sync system

-- First check what we have
SELECT 'Starting cleanup...' as status;

-- Delete votes first (to avoid FK constraints)
DELETE FROM votes;

-- Delete setlist songs
DELETE FROM setlist_songs;

-- Delete setlists
DELETE FROM setlists 
WHERE name LIKE '%Predicted%' 
OR created_by = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
OR id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Delete all setlists for now (we'll recreate from real data)
DELETE FROM setlists;

-- Delete songs without proper artist connections
DELETE FROM songs 
WHERE title = 'Electric Love' 
OR title = 'Love Story'
OR artist_name IN ('Drake', 'Bad Bunny', 'Dua Lipa', 'The Weeknd', 'Post Malone', 'Billie Eilish', 'Olivia Rodrigo');

-- Delete all songs for clean slate
DELETE FROM songs;

-- Delete show_artists junction table
DELETE FROM show_artists;

-- Delete shows without real Ticketmaster IDs
DELETE FROM shows 
WHERE ticketmaster_id IS NULL 
OR ticketmaster_id = ''
OR ticketmaster_id = 'mock-show-id'
OR name LIKE '%Eras Tour%';

-- Delete all shows for clean slate  
DELETE FROM shows;

-- Delete artist stats
DELETE FROM artist_stats;

-- Delete user follows
DELETE FROM user_follows_artists;

-- Delete artists without real IDs
DELETE FROM artists 
WHERE (spotify_id IS NULL OR spotify_id = '') 
AND (ticketmaster_id IS NULL OR ticketmaster_id = '');

-- Delete ALL artists for clean slate (we'll re-import fresh)
DELETE FROM artists;

-- Clean venues without real data
DELETE FROM venues
WHERE ticketmaster_id IS NULL OR ticketmaster_id = '';

-- Verify cleanup
SELECT 'Cleanup complete!' as status;
SELECT 'Artists remaining:', COUNT(*) FROM artists;
SELECT 'Shows remaining:', COUNT(*) FROM shows;
SELECT 'Songs remaining:', COUNT(*) FROM songs;
SELECT 'Setlists remaining:', COUNT(*) FROM setlists;
SELECT 'Venues remaining:', COUNT(*) FROM venues;