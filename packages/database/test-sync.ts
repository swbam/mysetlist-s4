import { eq, sql } from 'drizzle-orm';
import { db } from './src/client';
import { artistSongs, artistStats, artists, shows } from './src/schema';

async function testArtistSync() {
  try {
    // 1. Check if we have any artists in the database
    const _artistCount = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(artists);

    // 2. Get a sample artist with Spotify ID
    const [sampleArtist] = await db
      .select()
      .from(artists)
      .where(sql`spotify_id IS NOT NULL`)
      .limit(1);

    if (sampleArtist) {
      // 3. Check shows for this artist
      const [_showCount] = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(shows)
        .where(eq(shows.headlinerArtistId, sampleArtist.id));

      // 4. Check songs for this artist
      const [_songCount] = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(artistSongs)
        .where(eq(artistSongs.artistId, sampleArtist.id));

      // 5. Check artist stats
      const [stats] = await db
        .select()
        .from(artistStats)
        .where(eq(artistStats.artistId, sampleArtist.id))
        .limit(1);

      if (stats) {
      } else {
      }

      // 6. Test if sync would be triggered
      const _needsSync =
        !sampleArtist.lastSyncedAt ||
        new Date(sampleArtist.lastSyncedAt) <
          new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else {
    }

    // Shows without venues
    const [_showsWithoutVenues] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(shows)
      .where(sql`venue_id IS NULL`);

    // Artists without images
    const [_artistsWithoutImages] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(artists)
      .where(sql`image_url IS NULL`);
  } catch (_error) {
  } finally {
    process.exit(0);
  }
}

testArtistSync();
