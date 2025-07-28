#!/usr/bin/env tsx

import { faker } from "@faker-js/faker"
import { db, sql } from "./db-client"

// Set seed for consistent random data
faker.seed(123)

async function clearDatabase() {
  await db.execute(sql`
    -- Disable triggers temporarily
    SET session_replication_role = 'replica';
    
    -- Clear tables in correct order
    TRUNCATE TABLE votes CASCADE;
    TRUNCATE TABLE setlist_songs CASCADE;
    TRUNCATE TABLE setlists CASCADE;
    TRUNCATE TABLE venue_tips CASCADE;
    TRUNCATE TABLE show_artists CASCADE;
    TRUNCATE TABLE shows CASCADE;
    TRUNCATE TABLE user_follows_artists CASCADE;
    TRUNCATE TABLE artist_stats CASCADE;
    TRUNCATE TABLE songs CASCADE;
    TRUNCATE TABLE artists CASCADE;
    TRUNCATE TABLE venues CASCADE;
    TRUNCATE TABLE users CASCADE;
    
    -- Re-enable triggers
    SET session_replication_role = 'origin';
  `)
}

async function seedWithSQL() {
  // Create users
  await db.execute(sql`
    INSERT INTO users (email, role, email_verified, created_at)
    VALUES 
      ('admin@mysetlist.com', 'admin', NOW(), NOW()),
      ('moderator@mysetlist.com', 'moderator', NOW(), NOW()),
      ('user1@example.com', 'user', NOW(), NOW()),
      ('user2@example.com', 'user', NOW(), NOW()),
      ('user3@example.com', 'user', NOW(), NOW());
  `)

  // Create popular artists with high trending scores
  await db.execute(sql`
    INSERT INTO artists (name, slug, genres, popularity, followers, follower_count, monthly_listeners, verified, trending_score, created_at, spotify_id, ticketmaster_id)
    VALUES 
      ('Taylor Swift', 'taylor-swift', '["pop", "country"]', 98, 84000000, 8400, 84000000, true, 95, NOW(), '06HL4z0CvFAxyc27GXpf02', 'K8vZ917Gku7'),
      ('Bad Bunny', 'bad-bunny', '["reggaeton", "latin"]', 96, 65000000, 6500, 65000000, true, 92, NOW(), '4q3ewBCX7sLwd24euuV69X', 'K8vZ917oNX7'),
      ('The Weeknd', 'the-weeknd', '["r&b", "pop"]', 94, 76000000, 7600, 76000000, true, 90, NOW(), '1Xyo4u8uXC1ZmMpatF05PJ', 'K8vZ9171cb7'),
      ('Billie Eilish', 'billie-eilish', '["pop", "alternative"]', 92, 62000000, 6200, 62000000, true, 88, NOW(), '6qqNVTkY8uBg9cP3Jd7DAH', 'K8vZ917OB7f'),
      ('Drake', 'drake', '["hip hop", "r&b"]', 95, 71000000, 7100, 71000000, true, 91, NOW(), '3TVXtAsR1Inumwj472S9r4', 'K8vZ917Gcf7'),
      ('Arctic Monkeys', 'arctic-monkeys', '["indie rock", "alternative"]', 85, 42000000, 4200, 42000000, true, 82, NOW(), '7Ln80lUS6He07XvHI8qqHH', 'K8vZ9171M4f'),
      ('Dua Lipa', 'dua-lipa', '["pop", "dance"]', 87, 58000000, 5800, 58000000, true, 84, NOW(), '6M2wZ9GZgrQXHCFfjv46we', 'K8vZ917OcHf'),
      ('Post Malone', 'post-malone', '["hip hop", "pop"]', 90, 52000000, 5200, 52000000, true, 86, NOW(), '246dkjvS1zLTtiykXe5h60', 'K8vZ917Gc27'),
      ('Olivia Rodrigo', 'olivia-rodrigo', '["pop", "pop rock"]', 88, 40000000, 4000, 40000000, true, 85, NOW(), '1McMsnEElThX1knmY4oliG', 'K8vZ917w9x7'),
      ('Twenty One Pilots', 'twenty-one-pilots', '["alternative", "pop"]', 82, 36000000, 3600, 36000000, true, 78, NOW(), '3YQKmKGau1PzlVlkL1iodx', 'K8vZ91717I0'),
      ('Dispatch', 'dispatch', '["indie rock", "jam band", "folk rock"]', 75, 2500000, 2500, 2500000, true, 70, NOW(), '3k5U4n1dxgVQHhzf7nEvX4', 'K8vZ917oN27');
  `)

  // Create artist stats
  await db.execute(sql`
    INSERT INTO artist_stats (artist_id, total_shows, total_setlists, avg_setlist_length)
    SELECT 
      id,
      FLOOR(RANDOM() * 50 + 10),
      FLOOR(RANDOM() * 30 + 5),
      15 + RANDOM() * 10
    FROM artists;
  `)

  // Create venues
  await db.execute(sql`
    INSERT INTO venues (name, slug, city, state, country, capacity, venue_type, timezone, created_at)
    VALUES 
      ('Madison Square Garden', 'madison-square-garden', 'New York', 'NY', 'USA', 20789, 'arena', 'America/New_York', NOW()),
      ('The Forum', 'the-forum', 'Inglewood', 'CA', 'USA', 17505, 'arena', 'America/Los_Angeles', NOW()),
      ('United Center', 'united-center', 'Chicago', 'IL', 'USA', 20917, 'arena', 'America/Chicago', NOW()),
      ('Hollywood Bowl', 'hollywood-bowl', 'Los Angeles', 'CA', 'USA', 17500, 'amphitheater', 'America/Los_Angeles', NOW()),
      ('Red Rocks Amphitheatre', 'red-rocks', 'Morrison', 'CO', 'USA', 9525, 'amphitheater', 'America/Denver', NOW()),
      ('O2 Arena', 'o2-arena', 'London', NULL, 'UK', 20000, 'arena', 'Europe/London', NOW()),
      ('Bridgestone Arena', 'bridgestone-arena', 'Nashville', 'TN', 'USA', 20000, 'arena', 'America/Chicago', NOW()),
      ('Barclays Center', 'barclays-center', 'Brooklyn', 'NY', 'USA', 19000, 'arena', 'America/New_York', NOW()),
      ('Climate Pledge Arena', 'climate-pledge-arena', 'Seattle', 'WA', 'USA', 18100, 'arena', 'America/Los_Angeles', NOW()),
      ('FTX Arena', 'ftx-arena', 'Miami', 'FL', 'USA', 19600, 'arena', 'America/New_York', NOW());
  `)

  // Create shows with varying dates and trending scores
  await db.execute(sql`
    WITH artist_venue_pairs AS (
      SELECT 
        a.id as artist_id,
        v.id as venue_id,
        a.name as artist_name,
        v.name as venue_name,
        v.city as venue_city,
        a.popularity,
        ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY RANDOM()) as rn
      FROM artists a
      CROSS JOIN venues v
    )
    INSERT INTO shows (
      headliner_artist_id, venue_id, name, slug, date, start_time, doors_time,
      status, view_count, vote_count, trending_score, is_featured, is_verified,
      min_price, max_price, created_at
    )
    SELECT 
      artist_id,
      venue_id,
      artist_name || ' at ' || venue_name,
      LOWER(REPLACE(artist_name || '-' || venue_city || '-' || TO_CHAR(CURRENT_DATE + INTERVAL '1 day' * (rn * 7), 'YYYY-MM-DD'), ' ', '-')),
      CURRENT_DATE + INTERVAL '1 day' * (rn * 7 - 30 + FLOOR(RANDOM() * 60))::INTEGER,
      '20:00:00',
      '19:00:00',
      CASE 
        WHEN CURRENT_DATE + INTERVAL '1 day' * (rn * 7 - 30 + FLOOR(RANDOM() * 60))::INTEGER > CURRENT_DATE THEN 'upcoming'::show_status
        ELSE 'completed'::show_status
      END,
      FLOOR(popularity * (10 + RANDOM() * 90)),
      FLOOR(popularity * (1 + RANDOM() * 20)),
      CASE 
        WHEN CURRENT_DATE + INTERVAL '1 day' * (rn * 7 - 30 + FLOOR(RANDOM() * 60))::INTEGER BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE + INTERVAL '7 days' 
        THEN popularity * (0.8 + RANDOM() * 0.4)
        ELSE popularity * (0.3 + RANDOM() * 0.4)
      END,
      RANDOM() < 0.1,
      true,
      50 + FLOOR(RANDOM() * 100),
      150 + FLOOR(RANDOM() * 350),
      NOW() - (RANDOM() * INTERVAL '30 days')
    FROM artist_venue_pairs
    WHERE rn <= 3;
  `)

  // Create show_artists relationships
  await db.execute(sql`
    INSERT INTO show_artists (show_id, artist_id, order_index, set_length, is_headliner)
    SELECT 
      id,
      headliner_artist_id,
      0,
      90 + FLOOR(RANDOM() * 30),
      true
    FROM shows;
  `)

  // Create songs for each artist
  await db.execute(sql`
    WITH song_titles AS (
      SELECT unnest(ARRAY[
        'Midnight Dreams', 'Golden Hour', 'Stay With Me', 'Dancing in the Rain',
        'Electric Love', 'Summer Nights', 'Thunder Road', 'Breaking Chains',
        'Fire and Stone', 'Rebel Heart', 'Edge of Tomorrow', 'Gravity',
        'City Lights', 'On Top', 'No Limits', 'Real Talk',
        'Fading Echoes', 'Broken Glass', 'Silver Lining', 'Lost in Static'
      ]) AS title
    )
    INSERT INTO songs (title, artist, album, duration_ms, popularity, is_playable, created_at)
    SELECT 
      st.title || CASE WHEN ROW_NUMBER() OVER (PARTITION BY a.id) > 10 THEN ' (Remix)' ELSE '' END,
      a.name,
      'Album ' || FLOOR(ROW_NUMBER() OVER (PARTITION BY a.id) / 4 + 1),
      180000 + FLOOR(RANDOM() * 120000),
      a.popularity * (0.5 + RANDOM() * 0.5),
      true,
      NOW()
    FROM artists a
    CROSS JOIN song_titles st
    LIMIT 200;
  `)

  // Create setlists for shows
  await db.execute(sql`
    INSERT INTO setlists (show_id, artist_id, type, name, order_index, total_votes, created_at)
    SELECT 
      s.id,
      s.headliner_artist_id,
      CASE WHEN s.status = 'upcoming' THEN 'predicted'::setlist_type ELSE 'actual'::setlist_type END,
      'Main Set',
      0,
      FLOOR(RANDOM() * 100),
      NOW()
    FROM shows s;
  `)

  // Add songs to setlists
  await db.execute(sql`
    WITH setlist_songs_data AS (
      SELECT 
        sl.id as setlist_id,
        s.id as song_id,
        ROW_NUMBER() OVER (PARTITION BY sl.id ORDER BY RANDOM()) as position
      FROM setlists sl
      JOIN songs s ON s.artist = (
        SELECT name FROM artists WHERE id = sl.artist_id
      )
    )
    INSERT INTO setlist_songs (setlist_id, song_id, position, upvotes, downvotes, net_votes, created_at)
    SELECT 
      setlist_id,
      song_id,
      position,
      FLOOR(RANDOM() * 50),
      FLOOR(RANDOM() * 20),
      FLOOR(RANDOM() * 50) - FLOOR(RANDOM() * 20),
      NOW()
    FROM setlist_songs_data
    WHERE position <= 15;
  `)

  // Create user follows
  await db.execute(sql`
    INSERT INTO user_follows_artists (user_id, artist_id, created_at)
    SELECT DISTINCT
      u.id,
      a.id,
      NOW()
    FROM users u
    CROSS JOIN artists a
    WHERE u.role = 'user'
    AND RANDOM() < 0.4;
  `)

  // Update follower counts
  await db.execute(sql`
    UPDATE artists a
    SET follower_count = (
      SELECT COUNT(*) 
      FROM user_follows_artists ufa 
      WHERE ufa.artist_id = a.id
    );
  `)

  // Create some votes
  await db.execute(sql`
    INSERT INTO votes (user_id, setlist_song_id, vote_type, created_at)
    SELECT DISTINCT
      u.id,
      ss.id,
      CASE WHEN RANDOM() < 0.7 THEN 'up'::vote_type ELSE 'down'::vote_type END,
      NOW()
    FROM users u
    CROSS JOIN setlist_songs ss
    WHERE u.role = 'user'
    AND RANDOM() < 0.3
    ON CONFLICT (user_id, setlist_song_id) DO NOTHING;
  `)

  // Update aggregate counts
  await db.execute(sql`
    -- Update show vote counts
    UPDATE shows s
    SET vote_count = (
      SELECT COUNT(*)
      FROM votes v
      JOIN setlist_songs ss ON v.setlist_song_id = ss.id
      JOIN setlists sl ON ss.setlist_id = sl.id
      WHERE sl.show_id = s.id
    );
    
    -- Update trending scores for recent shows
    UPDATE shows
    SET trending_score = (view_count * 0.1 + vote_count * 0.5) * 
      POWER(0.5, EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0 / 48.0)
    WHERE status IN ('upcoming', 'ongoing');
    
    -- Update artist trending scores
    UPDATE artists a
    SET trending_score = (
      SELECT COALESCE(AVG(s.trending_score), 0)
      FROM shows s
      WHERE s.headliner_artist_id = a.id
      AND s.date >= CURRENT_DATE - INTERVAL '30 days'
    );
  `)
}

async function main() {
  try {
    await clearDatabase()
    await seedWithSQL()
  } catch (_error) {
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}
