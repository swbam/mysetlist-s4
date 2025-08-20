#!/usr/bin/env tsx

import { db, sql } from "./db-client";

async function seedEssentialData() {
  console.log("Seeding essential data for testing...\n");

  try {
    // Clear existing data
    console.log("Clearing existing data...");
    await db.execute(sql`
      TRUNCATE TABLE user_follows_artists CASCADE;
      TRUNCATE TABLE votes CASCADE;
      TRUNCATE TABLE setlist_songs CASCADE;
      TRUNCATE TABLE setlists CASCADE;
      TRUNCATE TABLE show_artists CASCADE;
      TRUNCATE TABLE shows CASCADE;
      TRUNCATE TABLE songs CASCADE;
      TRUNCATE TABLE artist_stats CASCADE;
      TRUNCATE TABLE artists CASCADE;
      TRUNCATE TABLE venues CASCADE;
      TRUNCATE TABLE users CASCADE;
    `);

    // Insert popular artists with proper trending scores
    console.log("Inserting artists...");
    await db.execute(sql`
      INSERT INTO artists (
        name, slug, genres, popularity, followers, follower_count, 
        monthly_listeners, verified, trending_score, created_at, 
        spotify_id, tm_attraction_id
      ) VALUES 
        ('Taylor Swift', 'taylor-swift', '["pop", "country"]', 98, 84000000, 8400, 84000000, true, 95, NOW(), '06HL4z0CvFAxyc27GXpf02', 'K8vZ917Gku7'),
        ('Bad Bunny', 'bad-bunny', '["reggaeton", "latin"]', 96, 65000000, 6500, 65000000, true, 92, NOW(), '4q3ewBCX7sLwd24euuV69X', 'K8vZ917oNX7'),
        ('The Weeknd', 'the-weeknd', '["r&b", "pop"]', 94, 76000000, 7600, 76000000, true, 90, NOW(), '1Xyo4u8uXC1ZmMpatF05PJ', 'K8vZ9171cb7'),
        ('Billie Eilish', 'billie-eilish', '["pop", "alternative"]', 92, 62000000, 6200, 62000000, true, 88, NOW(), '6qqNVTkY8uBg9cP3Jd7DAH', 'K8vZ917OB7f'),
        ('Drake', 'drake', '["hip hop", "r&b"]', 95, 71000000, 7100, 71000000, true, 91, NOW(), '3TVXtAsR1Inumwj472S9r4', 'K8vZ917Gcf7'),
        ('Olivia Rodrigo', 'olivia-rodrigo', '["pop", "pop rock"]', 88, 40000000, 4000, 40000000, true, 85, NOW(), '1McMsnEElThX1knmY4oliG', 'K8vZ917w9x7'),
        ('Arctic Monkeys', 'arctic-monkeys', '["indie rock", "alternative"]', 85, 42000000, 4200, 42000000, true, 82, NOW(), '7Ln80lUS6He07XvHI8qqHH', 'K8vZ9171M4f'),
        ('Dua Lipa', 'dua-lipa', '["pop", "dance"]', 87, 58000000, 5800, 58000000, true, 84, NOW(), '6M2wZ9GZgrQXHCFfjv46we', 'K8vZ917OcHf');
    `);

    // Insert venues
    console.log("Inserting venues...");
    await db.execute(sql`
      INSERT INTO venues (name, slug, city, state, country, capacity, venue_type, timezone, created_at) VALUES 
        ('Madison Square Garden', 'madison-square-garden', 'New York', 'NY', 'USA', 20789, 'arena', 'America/New_York', NOW()),
        ('The Forum', 'the-forum', 'Inglewood', 'CA', 'USA', 17505, 'arena', 'America/Los_Angeles', NOW()),
        ('United Center', 'united-center', 'Chicago', 'IL', 'USA', 20917, 'arena', 'America/Chicago', NOW()),
        ('Hollywood Bowl', 'hollywood-bowl', 'Los Angeles', 'CA', 'USA', 17500, 'amphitheater', 'America/Los_Angeles', NOW()),
        ('Red Rocks Amphitheatre', 'red-rocks', 'Morrison', 'CO', 'USA', 9525, 'amphitheater', 'America/Denver', NOW());
    `);

    // Create sample shows
    console.log("Inserting shows...");
    await db.execute(sql`
      WITH artist_venue_combinations AS (
        SELECT 
          a.id as artist_id,
          v.id as venue_id,
          a.name as artist_name,
          v.name as venue_name,
          a.popularity
        FROM artists a
        CROSS JOIN venues v
        LIMIT 20
      )
      INSERT INTO shows (
        headliner_artist_id, venue_id, name, slug, date, 
        status, trending_score, vote_count, view_count, created_at
      )
      SELECT 
        artist_id,
        venue_id,
        artist_name || ' at ' || venue_name,
        LOWER(REPLACE(artist_name || '-' || venue_name || '-2024', ' ', '-')),
        CURRENT_DATE + INTERVAL '30 days' + (RANDOM() * INTERVAL '60 days'),
        'upcoming'::show_status,
        popularity * (0.8 + RANDOM() * 0.4),
        FLOOR(popularity * (1 + RANDOM() * 10)),
        FLOOR(popularity * (10 + RANDOM() * 50)),
        NOW()
      FROM artist_venue_combinations;
    `);

    // Create past shows
    console.log("Inserting past shows...");
    await db.execute(sql`
      WITH artist_venue_combinations AS (
        SELECT 
          a.id as artist_id,
          v.id as venue_id,
          a.name as artist_name,
          v.name as venue_name,
          a.popularity
        FROM artists a
        CROSS JOIN venues v
        LIMIT 15
      )
      INSERT INTO shows (
        headliner_artist_id, venue_id, name, slug, date, 
        status, trending_score, vote_count, view_count, created_at
      )
      SELECT 
        artist_id,
        venue_id,
        artist_name || ' Live Tour ' || venue_name,
        LOWER(REPLACE(artist_name || '-tour-' || venue_name || '-2023', ' ', '-')),
        CURRENT_DATE - INTERVAL '30 days' + (RANDOM() * INTERVAL '200 days'),
        'completed'::show_status,
        popularity * (0.3 + RANDOM() * 0.3),
        FLOOR(popularity * (1 + RANDOM() * 15)),
        FLOOR(popularity * (20 + RANDOM() * 80)),
        NOW() - INTERVAL '30 days'
      FROM artist_venue_combinations;
    `);

    console.log("\nSeeding completed successfully!");
  } catch (error) {
    console.error("Error seeding data:", error);
  }
}

async function main() {
  try {
    await seedEssentialData();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
