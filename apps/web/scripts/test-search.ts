#!/usr/bin/env tsx

import * as path from 'path';
import * as dotenv from 'dotenv';
import postgres from 'postgres';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testSearch() {
  console.log('🔍 Testing search for "dispatch"...\n');

  // Use direct postgres client
  const sql = postgres(process.env['DATABASE_URL']!, {
    max: 1,
    ssl: process.env['NODE_ENV'] === 'production' ? 'require' : false,
  });

  try {
    // Search for Dispatch
    const results = await sql`
      SELECT 
        slug as id,
        name,
        image_url as "imageUrl",
        genres,
        spotify_id as "spotifyId",
        popularity
      FROM artists
      WHERE name ILIKE ${'%dispatch%'} OR coalesce(genres, '') ILIKE ${'%dispatch%'}
      LIMIT 10
    `;

    console.log(`Found ${results.length} result(s):\n`);

    results.forEach((artist, index) => {
      console.log(`${index + 1}. ${artist.name}`);
      console.log(`   - Slug: ${artist.id}`);
      console.log(`   - Spotify ID: ${artist.spotifyId || 'None'}`);
      console.log(`   - Genres: ${artist.genres || 'None'}`);
      console.log(`   - Popularity: ${artist.popularity || 0}`);
      console.log('');
    });

    await sql.end();
  } catch (error) {
    console.error('❌ Search failed:', error);
    await sql.end();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testSearch().catch(console.error);
}
