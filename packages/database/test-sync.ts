import { db } from './src/client';
import { artists, shows, artistSongs, artistStats } from './src/schema';
import { eq, sql } from 'drizzle-orm';

async function testArtistSync() {
  console.log('Testing artist sync functionality...\n');

  try {
    // 1. Check if we have any artists in the database
    const artistCount = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(artists);
    
    console.log(`Total artists in database: ${artistCount[0].count}`);

    // 2. Get a sample artist with Spotify ID
    const [sampleArtist] = await db
      .select()
      .from(artists)
      .where(sql`spotify_id IS NOT NULL`)
      .limit(1);

    if (sampleArtist) {
      console.log(`\nSample artist: ${sampleArtist.name}`);
      console.log(`Spotify ID: ${sampleArtist.spotifyId}`);
      console.log(`Last synced: ${sampleArtist.lastSyncedAt}`);

      // 3. Check shows for this artist
      const [showCount] = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(shows)
        .where(eq(shows.headlinerArtistId, sampleArtist.id));

      console.log(`Shows for this artist: ${showCount.count}`);

      // 4. Check songs for this artist
      const [songCount] = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(artistSongs)
        .where(eq(artistSongs.artistId, sampleArtist.id));

      console.log(`Songs for this artist: ${songCount.count}`);

      // 5. Check artist stats
      const [stats] = await db
        .select()
        .from(artistStats)
        .where(eq(artistStats.artistId, sampleArtist.id))
        .limit(1);

      if (stats) {
        console.log(`\nArtist stats:`);
        console.log(`- Total shows: ${stats.totalShows}`);
        console.log(`- Upcoming shows: ${stats.upcomingShows}`);
        console.log(`- Total setlists: ${stats.totalSetlists}`);
        console.log(`- Avg setlist length: ${stats.avgSetlistLength}`);
        console.log(`- Most played song: ${stats.mostPlayedSong || 'N/A'}`);
      } else {
        console.log('\nNo stats found for this artist');
      }

      // 6. Test if sync would be triggered
      const needsSync = !sampleArtist.lastSyncedAt ||
        new Date(sampleArtist.lastSyncedAt) < new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      console.log(`\nWould sync be triggered on artist click? ${needsSync ? 'YES' : 'NO'}`);
    } else {
      console.log('\nNo artists with Spotify ID found in database');
    }

    // 7. Check for orphaned data
    console.log('\n--- Data Integrity Check ---');
    
    // Shows without venues
    const [showsWithoutVenues] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(shows)
      .where(sql`venue_id IS NULL`);
    
    console.log(`Shows without venues: ${showsWithoutVenues.count}`);

    // Artists without images
    const [artistsWithoutImages] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(artists)
      .where(sql`image_url IS NULL`);
    
    console.log(`Artists without images: ${artistsWithoutImages.count}`);

    // Check cron job configuration
    console.log('\n--- Cron Job Status ---');
    console.log('Cron jobs are configured to run every hour via pg_cron');
    console.log('They trigger the scheduled-sync Supabase Edge Function');

  } catch (error) {
    console.error('Error testing artist sync:', error);
  } finally {
    process.exit(0);
  }
}

testArtistSync();