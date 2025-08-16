/**
 * Test script to test SpotifyCatalogIngest service
 */

import { db, artists, songs, artistSongs } from '@repo/database';
import { SpotifyCatalogIngest, ingestSpotifyCatalog } from './apps/web/lib/services/ingest/SpotifyCatalogIngest';
import { ProgressBus } from './apps/web/lib/services/progress/ProgressBus';

async function testCatalogIngest() {
  console.log('🎼 Testing Spotify Catalog Ingest...\n');

  try {
    // First, create a test artist with Spotify ID
    console.log('1️⃣ Creating test artist (Taylor Swift)...');
    const spotifyId = '06HL4z0CvFAxyc27GXpf02'; // Taylor Swift's Spotify ID
    
    const [artist] = await db
      .insert(artists)
      .values({
        tmAttractionId: 'K8vZ917G5h7', // Taylor Swift's Ticketmaster ID
        name: 'Taylor Swift',
        slug: 'taylor-swift',
        spotifyId: spotifyId,
        importStatus: 'catalog_pending',
        genres: JSON.stringify(['Pop', 'Country']),
      })
      .onConflictDoUpdate({
        target: artists.spotifyId,
        set: {
          name: 'Taylor Swift',
          slug: 'taylor-swift',
          importStatus: 'catalog_pending',
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!artist) {
      throw new Error('Failed to create test artist');
    }
    
    console.log(`✅ Test artist created: ${artist.name} (ID: ${artist.id})\n`);

    // Test 2: Set up progress reporter
    console.log('2️⃣ Setting up progress reporter...');
    const progressReporter = ProgressBus.createReporter(artist.id, {
      artistName: artist.name,
      jobId: `test-catalog-${Date.now()}`,
    });
    console.log('✅ Progress reporter created\n');

    // Test 3: Run catalog ingest with a small test (first 2 albums)
    console.log('3️⃣ Running catalog ingest (limited test)...');
    
    const ingestService = new SpotifyCatalogIngest({
      concurrency: 3, // Lower concurrency for testing
      progressReporter,
    });

    // Use the convenience function
    const result = await ingestSpotifyCatalog(artist.id, spotifyId, {
      concurrency: 3,
      progressReporter,
    });

    console.log('\n📊 Catalog Ingest Results:');
    console.log(`Albums processed: ${result.albumsProcessed}`);
    console.log(`Tracks processed: ${result.tracksProcessed}`);
    console.log(`Studio tracks ingested: ${result.studioTracksIngested}`);
    console.log(`Live tracks filtered (by features): ${result.liveFeaturesFiltered}`);
    console.log(`Live tracks filtered (by name): ${result.liveNameFiltered}`);
    console.log(`Duplicates filtered: ${result.duplicatesFiltered}`);
    console.log(`Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      result.errors.slice(0, 3).forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.type}: ${error.message}`);
      });
    }

    // Test 4: Verify data was actually stored
    console.log('\n4️⃣ Verifying stored data...');
    
    // Check songs count
    const songCount = await db
      .select()
      .from(artistSongs)
      .where(artistSongs.artistId === artist.id);
    
    console.log(`Found ${songCount.length} songs for ${artist.name} in database`);
    
    if (songCount.length > 0) {
      // Get a few sample songs
      const sampleSongs = await db
        .select({
          name: songs.name,
          artist: songs.artist,
          albumName: songs.albumName,
          popularity: songs.popularity,
          isLive: songs.isLive,
        })
        .from(artistSongs)
        .innerJoin(songs, artistSongs.songId === songs.id)
        .where(artistSongs.artistId === artist.id)
        .limit(5);
        
      console.log('\nSample songs ingested:');
      sampleSongs.forEach((song, i) => {
        console.log(`  ${i + 1}. ${song.name} (Popularity: ${song.popularity}, Live: ${song.isLive})`);
      });
    }

    // Test 5: Test the API endpoint
    console.log('\n5️⃣ Testing artist songs API endpoint...');
    const response = await fetch(`http://localhost:3002/api/artists/${artist.id}/songs?limit=5`);
    
    if (response.ok) {
      const apiData = await response.json();
      console.log(`✅ API returned ${apiData.songs?.length || 0} songs`);
      
      if (apiData.songs?.length > 0) {
        console.log('First 3 songs from API:');
        apiData.songs.slice(0, 3).forEach((song: any, i: number) => {
          console.log(`  ${i + 1}. ${song.title} (Popularity: ${song.popularity})`);
        });
      }
    } else {
      console.log(`❌ API request failed: ${response.status} ${response.statusText}`);
    }

    console.log('\n🎉 Catalog ingest test completed!');
    return {
      success: true,
      artistId: artist.id,
      songsIngested: result.studioTracksIngested,
    };

  } catch (error) {
    console.error('❌ Catalog ingest test failed:', error);
    throw error;
  }
}

// Run the test
testCatalogIngest().catch(console.error);