-- Essential seed data for MySetlist testing
-- This creates basic data for testing the application

BEGIN;

-- Insert popular artists
INSERT INTO artists (id, name, slug, spotify_id, image_url, bio, genres) VALUES
('11111111-1111-1111-1111-111111111111', 'Taylor Swift', 'taylor-swift', '06HL4z0CvFAxyc27GXpf02', 'https://i.scdn.co/image/ab6761610000e5eb5a00969a4698c3132a15fbb0', 'Grammy-winning pop and country superstar', '["pop", "country", "alternative"]'),
('22222222-2222-2222-2222-222222222222', 'The Beatles', 'the-beatles', '3WrFJ7ztbogyGnTHbHJFl2', 'https://i.scdn.co/image/ab6761610000e5eb4ce8cb26f133772b9e4d353', 'Legendary British rock band from Liverpool', '["rock", "pop", "psychedelic"]'),
('33333333-3333-3333-3333-333333333333', 'Arctic Monkeys', 'arctic-monkeys', '7Ln80lUS6He07XvHI8qqHH', 'https://i.scdn.co/image/ab6761610000e5eb7da39dea0a72f581535fb11f', 'British rock band formed in Sheffield', '["indie rock", "alternative rock"]'),
('44444444-4444-4444-4444-444444444444', 'Ed Sheeran', 'ed-sheeran', '6eUKZXaKkcviH0Ku9w2n3V', 'https://i.scdn.co/image/ab6761610000e5eb12d5ab979779aa6c2118163a', 'British singer-songwriter and guitarist', '["pop", "folk", "acoustic"]'),
('55555555-5555-5555-5555-555555555555', 'Queen', 'queen', '1dfeR4HaWDbWqFHLkxsg1d', 'https://i.scdn.co/image/ab6761610000e5ebe4b4de2d9b65d3bf4d71bd2a', 'Legendary British rock band fronted by Freddie Mercury', '["rock", "classic rock", "glam rock"]')
ON CONFLICT (id) DO NOTHING;

-- Update artist stats to make them look active
UPDATE artists SET 
  total_shows = 50 + (random() * 200)::integer,
  upcoming_shows = 2 + (random() * 8)::integer,
  monthly_listeners = 1000000 + (random() * 50000000)::integer,
  popularity = 70 + (random() * 30)::integer,
  updated_at = now()
WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 
            '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444',
            '55555555-5555-5555-5555-555555555555');

-- Create shows for these artists (using correct column names)
INSERT INTO shows (id, name, slug, headliner_artist_id, venue_id, date, start_time, status, description, ticket_url) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Taylor Swift: The Eras Tour', 'taylor-swift-eras-tour-2025', '11111111-1111-1111-1111-111111111111', 
  (SELECT id FROM venues LIMIT 1), '2025-09-15', '19:30:00', 'upcoming', 'The highly anticipated Eras Tour continues', 'https://ticketmaster.com/taylor-swift'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Arctic Monkeys Live', 'arctic-monkeys-live-2025', '33333333-3333-3333-3333-333333333333',
  (SELECT id FROM venues LIMIT 1 OFFSET 1), '2025-10-22', '20:00:00', 'upcoming', 'Arctic Monkeys return with new material', 'https://ticketmaster.com/arctic-monkeys'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Ed Sheeran Acoustic Tour', 'ed-sheeran-acoustic-2025', '44444444-4444-4444-4444-444444444444',
  (SELECT id FROM venues LIMIT 1 OFFSET 2), '2025-11-08', '19:00:00', 'upcoming', 'Intimate acoustic performance', 'https://ticketmaster.com/ed-sheeran'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Queen + Adam Lambert', 'queen-adam-lambert-2025', '55555555-5555-5555-5555-555555555555',
  (SELECT id FROM venues LIMIT 1 OFFSET 3), '2025-12-31', '21:00:00', 'upcoming', 'New Years Eve spectacular', 'https://ticketmaster.com/queen')
ON CONFLICT (id) DO NOTHING;

-- Link artists to shows (using correct columns)
INSERT INTO show_artists (id, show_id, artist_id, order_index, is_headliner) VALUES
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 1, true),
('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 1, true),
('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 1, true),
('44444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '55555555-5555-5555-5555-555555555555', 1, true)
ON CONFLICT (id) DO NOTHING;

-- Create setlists for these shows (using correct columns)
INSERT INTO setlists (id, show_id, artist_id, type, name) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'predicted', 'Taylor Swift - Predicted Setlist'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'predicted', 'Arctic Monkeys - Predicted Setlist'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 'predicted', 'Ed Sheeran - Predicted Setlist'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '55555555-5555-5555-5555-555555555555', 'predicted', 'Queen - Predicted Setlist')
ON CONFLICT (id) DO NOTHING;

-- Add some popular songs to each setlist (using correct columns)
INSERT INTO setlist_songs (id, setlist_id, song_id, position) 
SELECT 
  gen_random_uuid(),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  s.id,
  ROW_NUMBER() OVER (ORDER BY random())
FROM songs s 
WHERE s.title ILIKE '%shake%' OR s.title ILIKE '%love%' OR s.title ILIKE '%story%'
LIMIT 10
ON CONFLICT (id) DO NOTHING;

INSERT INTO setlist_songs (id, setlist_id, song_id, position) 
SELECT 
  gen_random_uuid(),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  s.id,
  ROW_NUMBER() OVER (ORDER BY random())
FROM songs s 
WHERE s.title ILIKE '%do%' OR s.title ILIKE '%you%' OR s.title ILIKE '%want%'
LIMIT 8
ON CONFLICT (id) DO NOTHING;

-- Update setlist vote counts based on songs added
UPDATE setlists SET 
  total_votes = (SELECT COUNT(*) FROM setlist_songs WHERE setlist_id = setlists.id),
  updated_at = now()
WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
            'cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd');

-- Update show statistics
UPDATE shows SET 
  vote_count = (SELECT COALESCE(SUM(sl.total_votes), 0) FROM setlists sl WHERE sl.show_id = shows.id),
  setlist_count = (SELECT COUNT(*) FROM setlists sl WHERE sl.show_id = shows.id),
  updated_at = now()
WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
            'cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd');

-- Update venue statistics based on shows
UPDATE venues SET 
  total_shows = (SELECT COUNT(*) FROM shows WHERE venue_id = venues.id),
  upcoming_shows = (SELECT COUNT(*) FROM shows WHERE venue_id = venues.id AND status = 'upcoming'),
  updated_at = now()
WHERE id IN (SELECT DISTINCT venue_id FROM shows WHERE venue_id IS NOT NULL);

COMMIT;