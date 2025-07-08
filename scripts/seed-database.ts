#!/usr/bin/env tsx

import { eq } from 'drizzle-orm';
import { artists, db } from '../packages/database';

// Simple Spotify client
class SpotifyClient {
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  async authenticate(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return;
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error('Spotify authentication failed');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;
  }

  async searchArtists(query: string, limit = 1): Promise<any> {
    await this.authenticate();

    const params = new URLSearchParams({
      q: query,
      type: 'artist',
      limit: limit.toString(),
    });

    const response = await fetch(
      `https://api.spotify.com/v1/search?${params}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify search failed: ${response.statusText}`);
    }

    return response.json();
  }
}

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
  'Green Day',
  'The 1975',
  'Fall Out Boy',
  'Paramore',
  'My Chemical Romance',
];

async function seedArtist(artistName: string) {
  try {
    console.log(`🔍 Searching for ${artistName}...`);

    const searchResults = await spotify.searchArtists(artistName, 1);
    if (!searchResults.artists?.items?.length) {
      console.log(`❌ ${artistName} not found on Spotify`);
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
      console.log(`✅ ${artistName} already exists, updating...`);

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
        .where(eq(artists.id, existingArtist[0].id))
        .returning();

      artistRecord = updated;
    } else {
      console.log(`🆕 Creating new artist record for ${artistName}...`);

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

    console.log(
      `✅ ${artistName} synced successfully! (${artistRecord.followers} followers)`
    );
    return artistRecord;
  } catch (error) {
    console.error(`❌ Failed to seed ${artistName}:`, error);
    return null;
  }
}

async function main() {
  console.log('🎵 Starting database seeding with popular artists...\n');

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

  console.log('\n📊 Seeding completed!');
  console.log(`✅ Success: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach((error) => console.log(`  - ${error}`));
  }

  console.log('\n🔧 Next steps:');
  console.log('1. Run sync jobs to get shows and song catalogs');
  console.log('2. Update trending scores via cron job');
  console.log('3. Test the trending and artist pages');
}

if (require.main === module) {
  main().catch(console.error);
}
