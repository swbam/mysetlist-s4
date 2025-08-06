-- Quick seed data for trending functionality
-- Insert sample artists with trending scores

INSERT INTO artists (id, name, slug, image_url, popularity, followers, follower_count, monthly_listeners, trending_score, spotify_id, external_ids, genres, created_at, updated_at) VALUES 
('artist-1', 'Taylor Swift', 'taylor-swift', 'https://i.scdn.co/image/ab6761610000e5eb859e4c14fa59296c8649e0e4', 95, 89000000, 89000000, 85000000, 950, '06HL4z0CvFAxyc27GXpf02', '{"spotify": "06HL4z0CvFAxyc27GXpf02"}', '["pop", "country"]', NOW(), NOW()),
('artist-2', 'The Weeknd', 'the-weeknd', 'https://i.scdn.co/image/ab6761610000e5eb0e08ea2c4d6789fbf5cccbbc', 92, 45000000, 45000000, 78000000, 920, '1Xyo4u8uXC1ZmMpatF05PJ', '{"spotify": "1Xyo4u8uXC1ZmMpatF05PJ"}', '["r&b", "pop"]', NOW(), NOW()),
('artist-3', 'Bad Bunny', 'bad-bunny', 'https://i.scdn.co/image/ab6761610000e5eb0c68f6c95232e716e8a4c2a3', 98, 52000000, 52000000, 95000000, 980, '4q3ewBCX7sLwd24euuV69X', '{"spotify": "4q3ewBCX7sLwd24euuV69X"}', '["reggaeton", "latin"]', NOW(), NOW()),
('artist-4', 'Billie Eilish', 'billie-eilish', 'https://i.scdn.co/image/ab6761610000e5ebc2b7c1b8ad2b04a6b2e1e6b7', 90, 38000000, 38000000, 65000000, 900, '6qqNVTkY8uBg9cP3Jd8DAH', '{"spotify": "6qqNVTkY8uBg9cP3Jd8DAH"}', '["pop", "alternative"]', NOW(), NOW()),
('artist-5', 'Drake', 'drake', 'https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9', 94, 67000000, 67000000, 88000000, 940, '3TVXtAsR1Inumwj472S9r4', '{"spotify": "3TVXtAsR1Inumwj472S9r4"}', '["hip-hop", "rap"]', NOW(), NOW()),
('artist-6', 'Olivia Rodrigo', 'olivia-rodrigo', 'https://i.scdn.co/image/ab6761610000e5eb0e08ea2c4d6789fbf5cccbbc', 88, 25000000, 25000000, 45000000, 880, '1McMsnEElThX1knmY4oliG', '{"spotify": "1McMsnEElThX1knmY4oliG"}', '["pop", "pop-rock"]', NOW(), NOW()),
('artist-7', 'Dua Lipa', 'dua-lipa', 'https://i.scdn.co/image/ab6761610000e5ebc6b7c1b8ad2b04a6b2e1e6b7', 87, 32000000, 32000000, 55000000, 870, '6M2wZ9GZgrQXHCFfjv46we', '{"spotify": "6M2wZ9GZgrQXHCFfjv46we"}', '["pop", "dance-pop"]', NOW(), NOW()),
('artist-8', 'Post Malone', 'post-malone', 'https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9', 89, 41000000, 41000000, 62000000, 890, '246dkjvS1zLTtiykXe5h60', '{"spotify": "246dkjvS1zLTtiykXe5h60"}', '["hip-hop", "pop"]', NOW(), NOW()),
('artist-9', 'Ariana Grande', 'ariana-grande', 'https://i.scdn.co/image/ab6761610000e5eb0e08ea2c4d6789fbf5cccbbc', 91, 49000000, 49000000, 72000000, 910, '66CXWjxzNUsdJxJ2JdwvnR', '{"spotify": "66CXWjxzNUsdJxJ2JdwvnR"}', '["pop", "r&b"]', NOW(), NOW()),
('artist-10', 'Harry Styles', 'harry-styles', 'https://i.scdn.co/image/ab6761610000e5ebc2b7c1b8ad2b04a6b2e1e6b7', 86, 29000000, 29000000, 48000000, 860, '6KImCVD70vtIoJWnq6nGn3', '{"spotify": "6KImCVD70vtIoJWnq6nGn3"}', '["pop", "rock"]', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
  trending_score = EXCLUDED.trending_score,
  popularity = EXCLUDED.popularity,
  followers = EXCLUDED.followers,
  updated_at = NOW();

-- Insert sample venues
INSERT INTO venues (id, name, slug, capacity, city, state, country, total_shows, upcoming_shows, created_at, updated_at) VALUES
('venue-1', 'Madison Square Garden', 'madison-square-garden', 20789, 'New York', 'NY', 'USA', 150, 12, NOW(), NOW()),
('venue-2', 'The Forum', 'the-forum', 17505, 'Inglewood', 'CA', 'USA', 85, 8, NOW(), NOW()),
('venue-3', 'Red Rocks Amphitheatre', 'red-rocks-amphitheatre', 9525, 'Morrison', 'CO', 'USA', 120, 15, NOW(), NOW()),
('venue-4', 'Staples Center', 'staples-center', 21000, 'Los Angeles', 'CA', 'USA', 95, 10, NOW(), NOW()),
('venue-5', 'Wembley Stadium', 'wembley-stadium', 90000, 'London', '', 'UK', 25, 3, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
  total_shows = EXCLUDED.total_shows,
  upcoming_shows = EXCLUDED.upcoming_shows,
  updated_at = NOW();

-- Insert sample shows
INSERT INTO shows (id, name, slug, date, venue_id, headliner_artist_id, vote_count, attendee_count, view_count, setlist_count, trending_score, created_at, updated_at) VALUES
('show-1', 'Taylor Swift - The Eras Tour', 'taylor-swift-eras-tour-msg-2024', '2024-08-15', 'venue-1', 'artist-1', 2500, 20789, 15000, 3, 950, NOW(), NOW()),
('show-2', 'Bad Bunny World Tour', 'bad-bunny-world-tour-forum-2024', '2024-09-20', 'venue-2', 'artist-3', 1800, 17505, 12000, 2, 920, NOW(), NOW()),
('show-3', 'The Weeknd - After Hours Tour', 'weeknd-after-hours-red-rocks-2024', '2024-07-10', 'venue-3', 'artist-2', 1200, 9525, 8000, 1, 880, NOW(), NOW()),
('show-4', 'Drake - It''s All a Blur Tour', 'drake-blur-tour-staples-2024', '2024-10-05', 'venue-4', 'artist-5', 2100, 21000, 18000, 4, 940, NOW(), NOW()),
('show-5', 'Billie Eilish - Happier Than Ever Tour', 'billie-eilish-happier-wembley-2024', '2024-06-30', 'venue-5', 'artist-4', 3200, 90000, 25000, 2, 900, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
  vote_count = EXCLUDED.vote_count,
  attendee_count = EXCLUDED.attendee_count,
  view_count = EXCLUDED.view_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = NOW();