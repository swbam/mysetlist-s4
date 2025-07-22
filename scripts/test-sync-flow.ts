#!/usr/bin/env tsx

import { db, artists, shows, songs, venues, setlists } from '@repo/database';
import { eq, sql } from 'drizzle-orm';
import { ArtistSyncService, ShowSyncService, SetlistSyncService, SyncScheduler } from '@repo/external-apis';

async function testSyncFlow() {
  console.log('🧪 Testing MySetlist Sync Flow...\n');

  try {
    // Test 1: Test database connection
    console.log('1️⃣ Testing database connection...');
    const dbTest = await db.select({ count: sql<number>`count(*)` }).from(artists);
    console.log('✅ Database connected. Artists count:', dbTest[0]?.count || 0);

    // Test 2: Test Spotify API authentication
    console.log('\n2️⃣ Testing Spotify API authentication...');
    const artistSync = new ArtistSyncService();
    try {
      // Search for a popular artist
      await artistSync.syncPopularArtists();
      console.log('✅ Spotify API authentication successful');
    } catch (error) {
      console.error('❌ Spotify API error:', error);
    }

    // Test 3: Test artist sync
    console.log('\n3️⃣ Testing artist sync...');
    const testArtistName = 'Taylor Swift';
    console.log(`Searching for ${testArtistName}...`);

    // Use SyncScheduler to sync artist data
    const scheduler = new SyncScheduler();
    try {
      await scheduler.syncArtistData(testArtistName);
      
      // Check if artist was synced
      const [syncedArtist] = await db
        .select()
        .from(artists)
        .where(eq(artists.name, testArtistName))
        .limit(1);

      if (syncedArtist) {
        console.log('✅ Artist synced successfully:', {
          name: syncedArtist.name,
          spotifyId: syncedArtist.spotifyId,
          followers: syncedArtist.followers,
          genres: syncedArtist.genres,
        });
      } else {
        console.log('⚠️ Artist not found after sync');
      }
    } catch (error) {
      console.error('❌ Artist sync error:', error);
    }

    // Test 4: Test show sync
    console.log('\n4️⃣ Testing show sync...');
    const showSync = new ShowSyncService();
    try {
      await showSync.syncUpcomingShows({
        city: 'New York',
        stateCode: 'NY',
        classificationName: 'Music',
      });

      const showCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(shows);
      
      console.log('✅ Shows synced. Total shows:', showCount[0]?.count || 0);
    } catch (error) {
      console.error('❌ Show sync error:', error);
    }

    // Test 5: Test venue count
    console.log('\n5️⃣ Checking venue data...');
    const venueCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(venues);
    console.log('📍 Total venues:', venueCount[0]?.count || 0);

    // Test 6: Test setlist sync
    console.log('\n6️⃣ Testing setlist sync...');
    const setlistSync = new SetlistSyncService();
    
    // Get a show to sync setlist for
    const [recentShow] = await db
      .select()
      .from(shows)
      .where(eq(shows.status, 'completed'))
      .limit(1);

    if (recentShow) {
      try {
        await setlistSync.syncSetlistByShowId(recentShow.id);
        
        const setlistCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(setlists)
          .where(eq(setlists.showId, recentShow.id));
        
        console.log('✅ Setlists synced for show. Count:', setlistCount[0]?.count || 0);
      } catch (error) {
        console.error('❌ Setlist sync error:', error);
      }
    } else {
      console.log('⚠️ No completed shows found for setlist sync test');
    }

    // Test 7: Test unified sync endpoint
    console.log('\n7️⃣ Testing unified sync endpoint...');
    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3001';
    
    // Get an artist to sync
    const [artistToSync] = await db
      .select()
      .from(artists)
      .limit(1);

    if (artistToSync) {
      try {
        const response = await fetch(`${appUrl}/api/sync/unified-pipeline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistId: artistToSync.id,
            mode: 'single',
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Unified sync successful:', {
            artist: result.results?.artist?.updated,
            songs: result.results?.songs?.synced,
            shows: result.results?.shows?.synced,
            setlists: result.results?.setlists?.synced,
          });
        } else {
          console.error('❌ Unified sync failed:', response.status, await response.text());
        }
      } catch (error) {
        console.error('❌ Unified sync error:', error);
      }
    }

    // Final summary
    console.log('\n📊 Final Database Summary:');
    const [artistCount, songCount, showCount, venueCountFinal, setlistCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(artists),
      db.select({ count: sql<number>`count(*)` }).from(songs),
      db.select({ count: sql<number>`count(*)` }).from(shows),
      db.select({ count: sql<number>`count(*)` }).from(venues),
      db.select({ count: sql<number>`count(*)` }).from(setlists),
    ]);

    console.log({
      artists: artistCount[0]?.count || 0,
      songs: songCount[0]?.count || 0,
      shows: showCount[0]?.count || 0,
      venues: venueCountFinal[0]?.count || 0,
      setlists: setlistCount[0]?.count || 0,
    });

    console.log('\n✅ Sync flow test completed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSyncFlow();