#!/usr/bin/env tsx

import * as path from 'node:path';
import * as dotenv from 'dotenv';
import postgres from 'postgres';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testSearch() {
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

    results.forEach((_artist, _index) => {});

    await sql.end();
  } catch (_error) {
    await sql.end();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testSearch().catch(console.error);
}
