-- Directly insert Metallica with all proper IDs for testing
INSERT INTO artists (
  id,
  ticketmaster_id,
  spotify_id,
  name,
  slug,
  image_url,
  genres,
  popularity,
  followers,
  verified,
  mbid,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'K8vZ9174v77', -- Metallica's real Ticketmaster ID
  '2ye2Wgw4gimLv2eAKyk1NB', -- Metallica's real Spotify ID  
  'Metallica',
  'metallica',
  'https://i.scdn.co/image/ab6761610000e5eb69ca98dd3083f1082d740e44',
  '["metal", "heavy metal", "rock"]',
  75,
  25000000,
  true,
  '65f4f0c5-ef9e-490c-aee3-909e7ae6b2ab', -- Metallica's MusicBrainz ID
  NOW(),
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  ticketmaster_id = EXCLUDED.ticketmaster_id,
  spotify_id = EXCLUDED.spotify_id,
  mbid = EXCLUDED.mbid,
  updated_at = NOW()
RETURNING id, name, ticketmaster_id, spotify_id, mbid;