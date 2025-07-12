#!/usr/bin/env tsx

import * as path from 'node:path';
import * as dotenv from 'dotenv';
import postgres from 'postgres';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function addDispatch() {
  // Use direct postgres client
  const sql = postgres(process.env['DATABASE_URL']!, {
    max: 1,
    ssl: process.env['NODE_ENV'] === 'production' ? 'require' : false,
  });

  try {
    // Check if Dispatch already exists
    const existing = await sql`
      SELECT id, name FROM artists WHERE slug = 'dispatch'
    `;

    if (existing.length > 0) {
      await sql.end();
      return;
    }

    // Add Dispatch
    await sql`
      INSERT INTO artists (
        name, slug, genres, popularity, followers, follower_count, 
        monthly_listeners, verified, trending_score, created_at, 
        spotify_id, ticketmaster_id, image_url
      )
      VALUES (
        'Dispatch', 
        'dispatch', 
        '["indie rock", "jam band", "folk rock"]', 
        75, 
        2500000, 
        2500, 
        2500000, 
        true, 
        70, 
        NOW(), 
        '3k5U4n1dxgVQHhzf7nEvX4', 
        'K8vZ917oN27',
        'https://i.scdn.co/image/ab6761610000e5eb3a49b0a3954e460a8a76ed90'
      )
    `;

    // Add some stats for Dispatch
    const artistResult = await sql`
      SELECT id FROM artists WHERE slug = 'dispatch'
    `;

    if (artistResult.length > 0) {
      const artistId = artistResult[0]!['id'];

      await sql`
        INSERT INTO artist_stats (artist_id, total_shows, total_setlists, avg_setlist_length)
        VALUES (${artistId}, 35, 25, 18)
        ON CONFLICT (artist_id) DO UPDATE
        SET total_shows = 35, total_setlists = 25, avg_setlist_length = 18
      `;

      // Add some songs for Dispatch
      await sql`
        INSERT INTO songs (title, artist, album, duration_ms, popularity, is_playable, created_at)
        VALUES 
          ('The General', 'Dispatch', 'Bang Bang', 240000, 85, true, NOW()),
          ('Bats in the Belfry', 'Dispatch', 'Bang Bang', 210000, 75, true, NOW()),
          ('Two Coins', 'Dispatch', 'Bang Bang', 195000, 70, true, NOW()),
          ('Out Loud', 'Dispatch', 'Bang Bang', 225000, 72, true, NOW()),
          ('Elias', 'Dispatch', 'Silent Steeples', 260000, 68, true, NOW()),
          ('Flying Horses', 'Dispatch', 'Silent Steeples', 280000, 71, true, NOW()),
          ('Open Up', 'Dispatch', 'Who Are We Living For?', 215000, 65, true, NOW()),
          ('Passerby', 'Dispatch', 'Who Are We Living For?', 235000, 63, true, NOW())
        ON CONFLICT DO NOTHING
      `;
    }

    await sql.end();
  } catch (_error) {
    await sql.end();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  addDispatch().catch(console.error);
}
