/**
 * Test Script for External API Adapters
 * Validates implementations against GROK.md specifications
 */

import {
  // Ticketmaster
  iterateEventsByAttraction,
  searchAttractions,
  testTicketmasterConnection,
  
  // Spotify
  getAccessToken,
  listAllAlbums,
  listAlbumTracks,
  getTracksDetails,
  getAudioFeatures,
  searchArtists,
  getArtist,
  testSpotifyConnection,
  getTokenCacheStatus,
} from './index';

/**
 * Test Ticketmaster API connectivity and basic functionality
 */
async function testTicketmaster() {
  console.log('\n=== Testing Ticketmaster API ===');
  
  try {
    // Test connectivity
    console.log('Testing Ticketmaster connectivity...');
    const connectionTest = await testTicketmasterConnection();
    console.log('Connection test result:', connectionTest);
    
    if (!connectionTest.success) {
      console.error('Ticketmaster connection failed:', connectionTest.error);
      return;
    }
    
    // Test artist search
    console.log('\nTesting artist search...');
    const searchResult = await searchAttractions('Taylor Swift', { size: 5 });
    console.log(`Found ${searchResult.attractions.length} attractions for "Taylor Swift"`);
    
    if (searchResult.attractions.length > 0) {
      const firstAttraction = searchResult.attractions[0];
      console.log(`First result: ${firstAttraction?.name} (ID: ${firstAttraction?.id})`);
      
      // Test event iteration
      console.log('\nTesting event iteration...');
      let eventCount = 0;
      let pageCount = 0;
      
      try {
        for await (const events of iterateEventsByAttraction(firstAttraction?.id || '')) {
          pageCount++;
          eventCount += events.length;
          console.log(`Page ${pageCount}: Retrieved ${events.length} events (total: ${eventCount})`);
          
          // Limit test to avoid too many requests
          if (pageCount >= 2) {
            console.log('Limiting test to 2 pages...');
            break;
          }
        }
        console.log(`Total events found: ${eventCount} across ${pageCount} pages`);
      } catch (error: any) {
        console.error('Event iteration error:', error.message);
      }
    }
    
  } catch (error: any) {
    console.error('Ticketmaster test error:', error.message);
  }
}

/**
 * Test Spotify API connectivity and basic functionality
 */
async function testSpotify() {
  console.log('\n=== Testing Spotify API ===');
  
  try {
    // Test connectivity and token
    console.log('Testing Spotify connectivity...');
    const connectionTest = await testSpotifyConnection();
    console.log('Connection test result:', connectionTest);
    
    if (!connectionTest.success) {
      console.error('Spotify connection failed:', connectionTest.error);
      return;
    }
    
    // Check token cache
    console.log('\nToken cache status:', getTokenCacheStatus());
    
    // Test artist search
    console.log('\nTesting artist search...');
    const searchResult = await searchArtists('Taylor Swift', { limit: 5 });
    console.log(`Found ${searchResult.artists.length} artists for "Taylor Swift"`);
    
    if (searchResult.artists.length > 0) {
      const firstArtist = searchResult.artists[0];
      if (!firstArtist) {
        console.log('No artist found in first result');
        return;
      }
      console.log(`First result: ${firstArtist.name} (ID: ${firstArtist.id})`);
      console.log(`Popularity: ${firstArtist.popularity}, Followers: ${firstArtist.followers.total}`);
      
      // Test album listing
      console.log('\nTesting album listing...');
      const albums = await listAllAlbums(firstArtist.id);
      console.log(`Found ${albums.length} albums`);
      
      if (albums.length > 0) {
        // Test with first album that has tracks
        const albumWithTracks = albums.find(album => album.total_tracks > 0);
        if (albumWithTracks) {
          console.log(`Testing with album: "${albumWithTracks.name}" (${albumWithTracks.total_tracks} tracks)`);
          
          // Test track listing
          console.log('\nTesting album tracks...');
          const tracks = await listAlbumTracks(albumWithTracks.id);
          console.log(`Retrieved ${tracks.length} tracks from album`);
          
          if (tracks.length > 0) {
            // Test track details (limit to first 5 tracks)
            const testTrackIds = tracks.slice(0, 5).map(track => track.id);
            console.log('\nTesting track details...');
            const trackDetails = await getTracksDetails(testTrackIds);
            console.log(`Retrieved details for ${trackDetails.length}/${testTrackIds.length} tracks`);
            
            // Test audio features
            console.log('\nTesting audio features...');
            const audioFeatures = await getAudioFeatures(testTrackIds);
            console.log(`Retrieved audio features for ${audioFeatures.length}/${testTrackIds.length} tracks`);
            
            if (audioFeatures.length > 0) {
              const firstFeature = audioFeatures[0];
              if (firstFeature) {
                console.log(`Sample audio features - Liveness: ${firstFeature.liveness}, Energy: ${firstFeature.energy}, Danceability: ${firstFeature.danceability}`);
              }
            }
          }
        }
      }
    }
    
  } catch (error: any) {
    console.error('Spotify test error:', error.message);
  }
}

/**
 * Test error handling and rate limiting
 */
async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===');
  
  // Test invalid Ticketmaster attraction ID
  try {
    console.log('Testing invalid Ticketmaster attraction ID...');
    const events: any[] = [];
    for await (const eventPage of iterateEventsByAttraction('invalid-id-12345')) {
      events.push(...eventPage);
    }
    console.log(`Unexpectedly got ${events.length} events for invalid ID`);
  } catch (error: any) {
    console.log(`Correctly handled invalid attraction ID: ${error.message}`);
  }
  
  // Test invalid Spotify artist ID
  try {
    console.log('\nTesting invalid Spotify artist ID...');
    const albums = await listAllAlbums('invalid-id-12345');
    console.log(`Unexpectedly got ${albums.length} albums for invalid ID`);
  } catch (error: any) {
    console.log(`Correctly handled invalid artist ID: ${error.message}`);
  }
  
  // Test empty batch operations
  try {
    console.log('\nTesting empty batch operations...');
    const emptyDetails = await getTracksDetails([]);
    const emptyFeatures = await getAudioFeatures([]);
    console.log(`Empty batches handled correctly: ${emptyDetails.length} details, ${emptyFeatures.length} features`);
  } catch (error: any) {
    console.error(`Unexpected error with empty batches: ${error.message}`);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting External API Adapters Test Suite');
  console.log('================================================');
  
  const startTime = Date.now();
  
  try {
    await testTicketmaster();
    await testSpotify();
    await testErrorHandling();
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Test suite completed successfully in ${duration}ms`);
    
  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
  }
}

// Export for use in other test files
export {
  testTicketmaster,
  testSpotify,
  testErrorHandling,
  runTests,
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}