#!/usr/bin/env tsx

import { artists } from '@repo/database/src/schema';
import { eq } from 'drizzle-orm';
import { SpotifyClient } from '@repo/external-apis';
import { db } from './db-client';

const spotify = new SpotifyClient();

// Popular artists to seed with - focusing on those likely to have upcoming shows
const popularArtists = [
  'Taylor Swift',
  'Bad Bunny',
  'Billie Eilish',
  'Harry Styles',
  'The Weeknd',
  'Dua Lipa',
  'Olivia Rodrigo',
  'Ed Sheeran',
  'Coldplay',
  'Imagine Dragons',
  'Arctic Monkeys',
  'Twenty One Pilots',
  'Foo Fighters',
  'Red Hot Chili Peppers',
  'Pearl Jam',
];

async function seedArtist(artistName: string) {
  try {
    await spotify.authenticate();
    const searchResults = await spotify.searchArtists(artistName, { limit: 1 });
    if (!searchResults.artists?.items?.length) {
      return null;
    }

    const spotifyArtist = searchResults.artists.items[0];

    // Generate slug
    const slug = spotifyArtist.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if artist already exists
    const existingArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.spotifyId, spotifyArtist.id))
      .limit(1);

    let artistRecord;

    if (existingArtist.length > 0) {
      const [updated] = await db
        .update(artists)
        .set({
          name: spotifyArtist.name,
          imageUrl: spotifyArtist.images[0]?.url,
          smallImageUrl: spotifyArtist.images[2]?.url,
          genres: JSON.stringify(spotifyArtist.genres || []),
          popularity: spotifyArtist.popularity || 0,
          followers: spotifyArtist.followers?.total || 0,
          verified: true,
          externalUrls: JSON.stringify(spotifyArtist.external_urls || {}),
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(artists.id, existingArtist[0]!['id']))
        .returning();

      artistRecord = updated;
    } else {
      const [created] = await db
        .insert(artists)
        .values({
          spotifyId: spotifyArtist.id,
          name: spotifyArtist.name,
          slug,
          imageUrl: spotifyArtist.images[0]?.url,
          smallImageUrl: spotifyArtist.images[2]?.url,
          genres: JSON.stringify(spotifyArtist.genres || []),
          popularity: spotifyArtist.popularity || 0,
          followers: spotifyArtist.followers?.total || 0,
          verified: true,
          externalUrls: JSON.stringify(spotifyArtist.external_urls || {}),
          lastSyncedAt: new Date(),
          trendingScore:
            Math.random() * 50 + (spotifyArtist.popularity || 0) / 2, // Generate some trending score
        })
        .returning();

      artistRecord = created;
    }
    return artistRecord;
  } catch (_error) {
    return null;
  }
}

async function main() {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const artistName of popularArtists) {
    try {
      const result = await seedArtist(artistName);
      if (result) {
        results.success++;
      } else {
        results.failed++;
      }

      // Rate limiting delay
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      results.failed++;
      results.errors.push(
        `${artistName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  if (results.errors.length > 0) {
    results.errors.forEach((_error) => {
      // Error handling can be added here if needed
    });
  }
}

if (require.main === module) {
  main().catch(console.error);
}
