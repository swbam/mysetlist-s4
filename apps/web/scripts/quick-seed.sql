-- Quick seed data for testing MySetlist app
-- Insert some popular artists with realistic data

INSERT INTO artists (
  id,
  spotify_id,
  name,
  slug,
  image_url,
  genres,
  popularity,
  followers,
  verified,
  trending_score,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  '06HL4z0CvFAxyc27GXpf02',
  'Taylor Swift',
  'taylor-swift',
  'https://i.scdn.co/image/ab6761610000e5ebf8b8b6dfe29d47d29c6b7e8a',
  '["pop", "country"]',
  100,
  50000000,
  true,
  85.5,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '4q3ewBCX7sLwd24euuV69X',
  'Bad Bunny',
  'bad-bunny',
  'https://i.scdn.co/image/ab6761610000e5eb4b1b1b1b1b1b1b1b1b1b1b1b',
  '["reggaeton", "latin trap"]',
  98,
  45000000,
  true,
  92.3,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '6qqNVTkY8uBg9cP3Jd8DAb',
  'Billie Eilish',
  'billie-eilish',
  'https://i.scdn.co/image/ab6761610000e5eb6b6b6b6b6b6b6b6b6b6b6b6b',
  '["pop", "alternative"]',
  96,
  42000000,
  true,
  88.7,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '4NHQUGzhtTLFvgF5SZesLK',
  'Tove Lo',
  'tove-lo',
  'https://i.scdn.co/image/ab6761610000e5eb7c7c7c7c7c7c7c7c7c7c7c7c',
  '["pop", "electropop"]',
  75,
  2500000,
  true,
  65.4,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '3TVXtAsR1Inumwj472S9r4',
  'Drake',
  'drake',
  'https://i.scdn.co/image/ab6761610000e5eb8d8d8d8d8d8d8d8d8d8d8d8d',
  '["hip hop", "rap"]',
  99,
  48000000,
  true,
  91.2,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '1Xyo4u8uXC1ZmMpatF05PJ',
  'The Weeknd',
  'the-weeknd',
  'https://i.scdn.co/image/ab6761610000e5eb9e9e9e9e9e9e9e9e9e9e9e9e',
  '["r&b", "pop"]',
  97,
  46000000,
  true,
  89.8,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '6M2wZ9GZgrQXHCFfjv46we',
  'Dua Lipa',
  'dua-lipa',
  'https://i.scdn.co/image/ab6761610000e5ebabababababababababababab',
  '["pop", "dance pop"]',
  94,
  40000000,
  true,
  86.1,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '1McMsnEElThX1knmY4oliG',
  'Olivia Rodrigo',
  'olivia-rodrigo',
  'https://i.scdn.co/image/ab6761610000e5ebcdcdcdcdcdcdcdcdcdcdcdcdcd',
  '["pop", "pop rock"]',
  93,
  38000000,
  true,
  87.3,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '4YRxDV8wJFPHPTeXepOstw',
  'Arijit Singh',
  'arijit-singh',
  'https://i.scdn.co/image/ab6761610000e5ebefefefefefefefefefefefe',
  '["bollywood", "indian pop"]',
  89,
  15000000,
  true,
  72.5,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '7ltDVBr6mKbRvohxheJ9h1',
  'ROSÉ',
  'rose',
  'https://i.scdn.co/image/ab6761610000e5eb121212121212121212121212',
  '["k-pop", "pop"]',
  91,
  25000000,
  true,
  83.9,
  NOW(),
  NOW()
);

-- Insert some venues
INSERT INTO venues (
  id,
  name,
  slug,
  city,
  state,
  country,
  capacity,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'Madison Square Garden',
  'madison-square-garden',
  'New York',
  'NY',
  'USA',
  20000,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'The Forum',
  'the-forum',
  'Los Angeles',
  'CA',
  'USA',
  17500,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Red Rocks Amphitheatre',
  'red-rocks-amphitheatre',
  'Morrison',
  'CO',
  'USA',
  9525,
  NOW(),
  NOW()
);

-- Insert some sample upcoming shows
-- Get some artist IDs first, then insert shows
WITH artist_data AS (
  SELECT id as artist_id, name as artist_name 
  FROM artists 
  WHERE name IN ('Taylor Swift', 'Bad Bunny', 'Billie Eilish')
  LIMIT 3
),
venue_data AS (
  SELECT id as venue_id, name as venue_name
  FROM venues
  LIMIT 3
)
INSERT INTO shows (
  id,
  headliner_artist_id,
  venue_id,
  name,
  slug,
  date,
  status,
  trending_score,
  vote_count,
  view_count,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  a.artist_id,
  v.venue_id,
  a.artist_name || ' Live at ' || v.venue_name,
  LOWER(REPLACE(a.artist_name || '-' || v.venue_name || '-2024', ' ', '-')),
  CURRENT_DATE + INTERVAL '30 days',
  'upcoming',
  RANDOM() * 100,
  FLOOR(RANDOM() * 500)::int,
  FLOOR(RANDOM() * 1000)::int,
  NOW(),
  NOW()
FROM artist_data a
CROSS JOIN venue_data v
LIMIT 9; 