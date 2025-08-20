/**
 * Comprehensive API Client Testing Script
 * Tests connectivity, authentication, and basic functionality for all API clients
 */

import { SpotifyApiClient } from './spotify-client';
import { TicketmasterApiClient } from './ticketmaster-client';
import { SetlistFmClient } from './setlistfm-client';

interface TestResult {
  service: string;
  success: boolean;
  authenticated?: boolean;
  healthy?: boolean;
  responseTime?: number;
  rateLimit?: {
    remaining?: number;
    resetTime?: number;
    limit?: number;
  };
  error?: string;
  details?: any;
}

interface TestSuite {
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

/**
 * Test Spotify API Client
 */
async function testSpotifyClient(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🎵 Testing Spotify API Client...');
    
    const client = new SpotifyApiClient();
    
    // Test connection and authentication
    const connectionTest = await client.testConnection();
    
    if (!connectionTest.success) {
      return {
        service: 'Spotify',
        success: false,
        authenticated: connectionTest.authenticated,
        responseTime: Date.now() - startTime,
        error: connectionTest.error,
      };
    }

    // Test basic functionality
    console.log('  ✓ Connection and authentication successful');
    
    // Test artist search
    const searchResponse = await client.searchArtists('Taylor Swift', { limit: 1 });
    console.log('  ✓ Artist search working');
    
    // Test token cache status
    const tokenStatus = client.getTokenCacheStatus();
    console.log(`  ✓ Token cache: ${tokenStatus.hasToken ? 'active' : 'empty'}`);
    
    // Test client metrics
    const metrics = client.getMetrics();
    console.log(`  ✓ API metrics: ${metrics.circuitBreaker.state} circuit, ${metrics.rateLimit.tokensRemaining} tokens remaining`);

    return {
      service: 'Spotify',
      success: true,
      authenticated: true,
      healthy: true,
      responseTime: Date.now() - startTime,
      details: {
        artistsFound: searchResponse.data.artists.items.length,
        tokenStatus,
        metrics: {
          requests: metrics.totalRequests,
          successRate: metrics.totalRequests > 0 ? (metrics.successfulRequests / metrics.totalRequests * 100).toFixed(1) + '%' : '0%',
          averageResponseTime: Math.round(metrics.averageResponseTime) + 'ms',
        },
      },
    };

  } catch (error: any) {
    console.log(`  ✗ Spotify test failed: ${error.message}`);
    
    return {
      service: 'Spotify',
      success: false,
      authenticated: error.status !== 401,
      responseTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Test Ticketmaster API Client
 */
async function testTicketmasterClient(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🎫 Testing Ticketmaster API Client...');
    
    const client = new TicketmasterApiClient();
    
    // Test connection
    const connectionTest = await client.testConnection();
    
    if (!connectionTest.success) {
      return {
        service: 'Ticketmaster',
        success: false,
        authenticated: connectionTest.authenticated,
        responseTime: Date.now() - startTime,
        rateLimit: connectionTest.rateLimit,
        error: connectionTest.error,
      };
    }

    console.log('  ✓ Connection and authentication successful');
    
    // Test attraction search
    const attractionResponse = await client.searchAttractions({ 
      keyword: 'Taylor Swift',
      size: 1 
    });
    console.log('  ✓ Attraction search working');
    
    // Test event search
    const eventResponse = await client.searchEvents({ 
      keyword: 'concert',
      size: 1,
      classificationName: 'Music'
    });
    console.log('  ✓ Event search working');
    
    // Test client metrics
    const metrics = client.getMetrics();
    console.log(`  ✓ API metrics: ${metrics.circuitBreaker.state} circuit, ${metrics.rateLimit.tokensRemaining} tokens remaining`);

    return {
      service: 'Ticketmaster',
      success: true,
      authenticated: true,
      healthy: true,
      responseTime: Date.now() - startTime,
      rateLimit: connectionTest.rateLimit,
      details: {
        attractionsFound: attractionResponse.data._embedded?.attractions?.length || 0,
        eventsFound: eventResponse.data._embedded?.events?.length || 0,
        metrics: {
          requests: metrics.totalRequests,
          successRate: metrics.totalRequests > 0 ? (metrics.successfulRequests / metrics.totalRequests * 100).toFixed(1) + '%' : '0%',
          averageResponseTime: Math.round(metrics.averageResponseTime) + 'ms',
        },
      },
    };

  } catch (error: any) {
    console.log(`  ✗ Ticketmaster test failed: ${error.message}`);
    
    return {
      service: 'Ticketmaster',
      success: false,
      authenticated: error.status !== 401 && error.status !== 403,
      responseTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Test SetlistFM API Client
 */
async function testSetlistFmClient(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🎤 Testing SetlistFM API Client...');
    
    const client = new SetlistFmClient();
    
    // Test connection
    const connectionTest = await client.testConnection();
    
    if (!connectionTest.success) {
      return {
        service: 'SetlistFM',
        success: false,
        authenticated: connectionTest.authenticated,
        responseTime: Date.now() - startTime,
        rateLimit: connectionTest.rateLimit,
        error: connectionTest.error,
      };
    }

    console.log('  ✓ Connection and authentication successful');
    
    // Test artist search
    const artistResponse = await client.searchArtists('Taylor Swift', { page: 1 });
    console.log('  ✓ Artist search working');
    
    // Test venue search
    const venueResponse = await client.searchVenues('Madison Square Garden', { page: 1 });
    console.log('  ✓ Venue search working');
    
    // Test client metrics
    const metrics = client.getMetrics();
    console.log(`  ✓ API metrics: ${metrics.circuitBreaker.state} circuit, ${metrics.rateLimit.tokensRemaining} tokens remaining`);

    return {
      service: 'SetlistFM',
      success: true,
      authenticated: true,
      healthy: true,
      responseTime: Date.now() - startTime,
      rateLimit: connectionTest.rateLimit,
      details: {
        artistsFound: artistResponse.data.artist?.length || 0,
        venuesFound: venueResponse.data.venue?.length || 0,
        totalArtists: artistResponse.data.total,
        totalVenues: venueResponse.data.total,
        metrics: {
          requests: metrics.totalRequests,
          successRate: metrics.totalRequests > 0 ? (metrics.successfulRequests / metrics.totalRequests * 100).toFixed(1) + '%' : '0%',
          averageResponseTime: Math.round(metrics.averageResponseTime) + 'ms',
        },
      },
    };

  } catch (error: any) {
    console.log(`  ✗ SetlistFM test failed: ${error.message}`);
    
    return {
      service: 'SetlistFM',
      success: false,
      authenticated: error.status !== 401 && error.status !== 403,
      responseTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Run comprehensive API client tests
 */
export async function runApiTests(): Promise<TestSuite> {
  const startTime = Date.now();
  
  console.log('🚀 Starting comprehensive API client tests...\n');
  
  const results: TestResult[] = [];
  
  // Run all tests in parallel for faster execution
  const testPromises = [
    testSpotifyClient(),
    testTicketmasterClient(),
    testSetlistFmClient(),
  ];
  
  const testResults = await Promise.all(testPromises);
  results.push(...testResults);
  
  const duration = Date.now() - startTime;
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const timing = `(${result.responseTime}ms)`;
    
    console.log(`${status} ${result.service} ${timing}`);
    
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
    
    if (result.details) {
      console.log(`    Details: ${JSON.stringify(result.details, null, 4)}`);
    }
    
    if (result.rateLimit) {
      console.log(`    Rate Limit: ${result.rateLimit.remaining} requests remaining`);
    }
  });
  
  console.log(`\nTotal: ${results.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${duration}ms`);
  console.log(`Success Rate: ${(passed / results.length * 100).toFixed(1)}%`);
  
  return {
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      duration,
    },
  };
}

/**
 * Test individual service integrations with real data
 */
export async function testServiceIntegrations(): Promise<void> {
  console.log('\n🔗 Testing service integrations with real data...\n');
  
  try {
    // Test cross-service data correlation
    console.log('🔍 Testing cross-service data correlation for Taylor Swift...');
    
    // Search for Taylor Swift across all services
    const spotify = new SpotifyApiClient();
    const ticketmaster = new TicketmasterApiClient();
    const setlistfm = new SetlistFmClient();
    
    const [spotifyArtists, ticketmasterAttractions, setlistfmArtists] = await Promise.all([
      spotify.searchArtists('Taylor Swift', { limit: 1 }),
      ticketmaster.searchAttractions({ keyword: 'Taylor Swift', size: 1 }),
      setlistfm.searchArtists('Taylor Swift', { page: 1 }),
    ]);
    
    console.log('Cross-service results:');
    console.log(`  Spotify: ${spotifyArtists.data.artists.items.length} artists found`);
    console.log(`  Ticketmaster: ${ticketmasterAttractions.data._embedded?.attractions?.length || 0} attractions found`);
    console.log(`  SetlistFM: ${setlistfmArtists.data.artist?.length || 0} artists found`);
    
    // Test data enrichment workflow
    if (spotifyArtists.data.artists.items.length > 0) {
      const artist = spotifyArtists.data.artists.items[0];
      console.log(`\n🎵 Found Spotify artist: "${artist.name}" (${artist.popularity} popularity)`);
      
      // Get albums
      const albumsResponse = await spotify.getArtistAlbums(artist.id, { limit: 5 });
      console.log(`  📀 Albums found: ${albumsResponse.data.items.length}`);
      
      // Get top tracks
      const tracksResponse = await spotify.getArtistTopTracks(artist.id);
      console.log(`  🎵 Top tracks: ${tracksResponse.data.tracks.length}`);
    }
    
    // Test event data correlation
    if (ticketmasterAttractions.data._embedded?.attractions?.length) {
      const attraction = ticketmasterAttractions.data._embedded.attractions[0];
      console.log(`\n🎫 Found Ticketmaster attraction: "${attraction.name}"`);
      
      // Get recent events for this attraction
      const eventsGenerator = ticketmaster.iterateAttractionEvents(attraction.id);
      let eventCount = 0;
      
      try {
        const firstPage = await eventsGenerator.next();
        if (!firstPage.done && firstPage.value.length > 0) {
          eventCount = firstPage.value.length;
          console.log(`  📅 Recent events found: ${eventCount}`);
        }
      } catch (error) {
        console.log(`  📅 No events found or error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log('\n✅ Service integration tests completed successfully');
    
  } catch (error) {
    console.error('\n❌ Service integration test failed:', error);
  }
}

/**
 * Main test runner
 */
export async function main() {
  try {
    // Run basic connectivity tests
    const testResults = await runApiTests();
    
    // If all basic tests pass, run integration tests
    if (testResults.summary.passed === testResults.summary.total) {
      await testServiceIntegrations();
    } else {
      console.log('\n⚠️ Skipping integration tests due to failed connectivity tests');
    }
    
    console.log('\n🏁 All tests completed');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Export individual test functions for modular usage
export {
  testSpotifyClient,
  testTicketmasterClient,
  testSetlistFmClient,
};

// Run tests if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}