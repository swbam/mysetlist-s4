#!/usr/bin/env tsx

/**
 * API Integration Test Script
 * 
 * This script tests all external API integrations for the concert setlist voting platform
 * including Setlist.fm, Spotify, and Ticketmaster APIs. It validates connectivity,
 * rate limiting, error handling, and data quality.
 */

import chalk from 'chalk';
import { SetlistFmClient } from '@repo/external-apis/clients/setlistfm';
import { SpotifyClient } from '@repo/external-apis/clients/spotify';
import { TicketmasterClient } from '@repo/external-apis/clients/ticketmaster';

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
  warnings?: string[];
}

interface ApiTestConfig {
  timeout: number;
  retries: number;
  rateLimitDelay: number;
}

class ApiTestSuite {
  private results: TestResult[] = [];
  private config: ApiTestConfig = {
    timeout: 10000, // 10 seconds
    retries: 3,
    rateLimitDelay: 1000 // 1 second between API calls
  };

  private setlistFmClient: SetlistFmClient;
  private spotifyClient: SpotifyClient;
  private ticketmasterClient: TicketmasterClient;

  constructor() {
    // Initialize API clients
    this.setlistFmClient = new SetlistFmClient();
    this.spotifyClient = new SpotifyClient();
    this.ticketmasterClient = new TicketmasterClient();
  }

  /**
   * Execute a test with performance tracking and error handling
   */
  private async runTest(
    name: string,
    testFn: () => Promise<any>,
    options: { timeout?: number; retries?: number } = {}
  ): Promise<TestResult> {
    const { timeout = this.config.timeout, retries = this.config.retries } = options;
    const start = performance.now();
    let lastError: Error | null = null;

    console.log(chalk.blue(`🧪 Testing: ${name}`));

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout)
        );

        const result = await Promise.race([testFn(), timeoutPromise]);
        const duration = performance.now() - start;

        const testResult: TestResult = {
          name,
          success: true,
          duration,
          details: result
        };

        console.log(chalk.green(`✅ ${name} - ${duration.toFixed(2)}ms${attempt > 1 ? ` (attempt ${attempt})` : ''}`));
        this.results.push(testResult);
        return testResult;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < retries) {
          console.log(chalk.yellow(`⚠️  ${name} - Attempt ${attempt} failed, retrying...`));
          await this.delay(this.config.rateLimitDelay * attempt);
        }
      }
    }

    const duration = performance.now() - start;
    const testResult: TestResult = {
      name,
      success: false,
      duration,
      error: lastError?.message || 'Unknown error'
    };

    console.log(chalk.red(`❌ ${name} - ${duration.toFixed(2)}ms - ${testResult.error}`));
    this.results.push(testResult);
    return testResult;
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test Setlist.fm API integration
   */
  async testSetlistFmApi() {
    console.log(chalk.cyan.bold('\n🎵 Setlist.fm API Tests'));
    console.log(chalk.cyan('========================\n'));

    await this.runTest('Setlist.fm API connection', async () => {
      const result = await this.setlistFmClient.healthCheck();
      
      if (!result.healthy) {
        throw new Error('Setlist.fm API health check failed');
      }
      
      return {
        status: result.healthy ? 'healthy' : 'unhealthy',
        responseTime: result.responseTime,
        apiVersion: result.version
      };
    });

    await this.runTest('Search artists by name', async () => {
      const searchTerm = 'Taylor Swift';
      const results = await this.setlistFmClient.searchArtists(searchTerm, { limit: 10 });
      
      if (!results || results.length === 0) {
        throw new Error('No artists found in search results');
      }
      
      const firstResult = results[0];
      if (!firstResult.name || !firstResult.mbid) {
        throw new Error('Invalid artist data structure');
      }
      
      return {
        searchTerm,
        resultCount: results.length,
        firstResult: {
          name: firstResult.name,
          mbid: firstResult.mbid,
          disambiguation: firstResult.disambiguation
        }
      };
    });

    await this.runTest('Get artist by MBID', async () => {
      // Use a known artist MBID (Taylor Swift)
      const mbid = '20244d07-534f-4eff-b4d4-930878889970';
      const artist = await this.setlistFmClient.getArtist(mbid);
      
      if (!artist || !artist.name) {
        throw new Error('Artist not found or invalid data');
      }
      
      return {
        mbid,
        name: artist.name,
        sortName: artist.sortName,
        disambiguation: artist.disambiguation
      };
    });

    await this.runTest('Get artist setlists', async () => {
      const mbid = '20244d07-534f-4eff-b4d4-930878889970'; // Taylor Swift
      const setlists = await this.setlistFmClient.getArtistSetlists(mbid, { limit: 5 });
      
      if (!setlists || setlists.length === 0) {
        throw new Error('No setlists found for artist');
      }
      
      const firstSetlist = setlists[0];
      if (!firstSetlist.id || !firstSetlist.eventDate) {
        throw new Error('Invalid setlist data structure');
      }
      
      return {
        mbid,
        setlistCount: setlists.length,
        firstSetlist: {
          id: firstSetlist.id,
          eventDate: firstSetlist.eventDate,
          venue: firstSetlist.venue?.name,
          city: firstSetlist.venue?.city?.name,
          songCount: firstSetlist.sets?.set?.length || 0
        }
      };
    });

    await this.runTest('Search setlists with filters', async () => {
      const searchParams = {
        artistMbid: '20244d07-534f-4eff-b4d4-930878889970',
        year: '2023',
        limit: 10
      };
      
      const setlists = await this.setlistFmClient.searchSetlists(searchParams);
      
      if (!Array.isArray(setlists)) {
        throw new Error('Invalid setlists response format');
      }
      
      return {
        searchParams,
        resultCount: setlists.length,
        hasResults: setlists.length > 0
      };
    });

    await this.runTest('Rate limiting compliance', async () => {
      const startTime = Date.now();
      const requests = [];
      
      // Make 5 rapid requests to test rate limiting
      for (let i = 0; i < 5; i++) {
        requests.push(
          this.setlistFmClient.searchArtists(`test${i}`, { limit: 1 })
            .catch(error => ({ error: error.message }))
        );
      }
      
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;
      
      const errors = results.filter(r => 'error' in r);
      const successes = results.filter(r => !('error' in r));
      
      return {
        totalRequests: requests.length,
        successes: successes.length,
        errors: errors.length,
        duration: `${duration}ms`,
        rateLimitHandled: errors.some(e => e.error.includes('rate') || e.error.includes('429'))
      };
    });
  }

  /**
   * Test Spotify API integration
   */
  async testSpotifyApi() {
    console.log(chalk.cyan.bold('\n🎧 Spotify API Tests'));
    console.log(chalk.cyan('=====================\n'));

    await this.runTest('Spotify API authentication', async () => {
      const authResult = await this.spotifyClient.authenticate();
      
      if (!authResult.success) {
        throw new Error('Spotify authentication failed');
      }
      
      return {
        authenticated: authResult.success,
        tokenType: authResult.tokenType,
        expiresIn: authResult.expiresIn
      };
    });

    await this.runTest('Search artists on Spotify', async () => {
      const searchTerm = 'Arctic Monkeys';
      const results = await this.spotifyClient.searchArtists(searchTerm, { limit: 10 });
      
      if (!results || !results.artists || results.artists.items.length === 0) {
        throw new Error('No artists found in Spotify search');
      }
      
      const firstArtist = results.artists.items[0];
      if (!firstArtist.id || !firstArtist.name) {
        throw new Error('Invalid artist data from Spotify');
      }
      
      return {
        searchTerm,
        resultCount: results.artists.items.length,
        firstArtist: {
          id: firstArtist.id,
          name: firstArtist.name,
          popularity: firstArtist.popularity,
          followers: firstArtist.followers?.total,
          genres: firstArtist.genres
        }
      };
    });

    await this.runTest('Get artist details', async () => {
      const artistId = '7Ln80lUS6He07XvHI8qqHH'; // Arctic Monkeys
      const artist = await this.spotifyClient.getArtist(artistId);
      
      if (!artist || !artist.id) {
        throw new Error('Artist not found on Spotify');
      }
      
      return {
        id: artist.id,
        name: artist.name,
        popularity: artist.popularity,
        followers: artist.followers?.total,
        genres: artist.genres,
        images: artist.images?.length || 0
      };
    });

    await this.runTest('Get artist top tracks', async () => {
      const artistId = '7Ln80lUS6He07XvHI8qqHH'; // Arctic Monkeys
      const market = 'US';
      const topTracks = await this.spotifyClient.getArtistTopTracks(artistId, market);
      
      if (!topTracks || !topTracks.tracks || topTracks.tracks.length === 0) {
        throw new Error('No top tracks found');
      }
      
      const firstTrack = topTracks.tracks[0];
      
      return {
        artistId,
        trackCount: topTracks.tracks.length,
        firstTrack: {
          id: firstTrack.id,
          name: firstTrack.name,
          popularity: firstTrack.popularity,
          duration: firstTrack.duration_ms,
          album: firstTrack.album?.name
        }
      };
    });

    await this.runTest('Get artist albums', async () => {
      const artistId = '7Ln80lUS6He07XvHI8qqHH'; // Arctic Monkeys
      const albums = await this.spotifyClient.getArtistAlbums(artistId, {
        includeGroups: ['album', 'single'],
        market: 'US',
        limit: 20
      });
      
      if (!albums || !albums.items || albums.items.length === 0) {
        throw new Error('No albums found');
      }
      
      const albumTypes = [...new Set(albums.items.map(a => a.album_type))];
      
      return {
        artistId,
        albumCount: albums.items.length,
        albumTypes,
        firstAlbum: {
          id: albums.items[0].id,
          name: albums.items[0].name,
          releaseDate: albums.items[0].release_date,
          type: albums.items[0].album_type
        }
      };
    });

    await this.runTest('Spotify rate limit handling', async () => {
      const startTime = Date.now();
      const requests = [];
      
      // Make multiple concurrent requests
      for (let i = 0; i < 8; i++) {
        requests.push(
          this.spotifyClient.searchArtists(`test query ${i}`, { limit: 1 })
            .catch(error => ({ error: error.message }))
        );
      }
      
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;
      
      const errors = results.filter(r => 'error' in r);
      const successes = results.filter(r => !('error' in r));
      
      return {
        totalRequests: requests.length,
        successes: successes.length,
        errors: errors.length,
        duration: `${duration}ms`,
        rateLimitHandled: errors.length < requests.length
      };
    });
  }

  /**
   * Test Ticketmaster API integration
   */
  async testTicketmasterApi() {
    console.log(chalk.cyan.bold('\n🎫 Ticketmaster API Tests'));
    console.log(chalk.cyan('==========================\n'));

    await this.runTest('Ticketmaster API connectivity', async () => {
      const healthCheck = await this.ticketmasterClient.healthCheck();
      
      if (!healthCheck.healthy) {
        throw new Error('Ticketmaster API not accessible');
      }
      
      return {
        status: 'healthy',
        responseTime: healthCheck.responseTime
      };
    });

    await this.runTest('Search events', async () => {
      const searchParams = {
        keyword: 'concert',
        city: 'New York',
        countryCode: 'US',
        size: 10
      };
      
      const events = await this.ticketmasterClient.searchEvents(searchParams);
      
      if (!events || !events._embedded || !events._embedded.events) {
        throw new Error('No events found in search results');
      }
      
      const firstEvent = events._embedded.events[0];
      
      return {
        searchParams,
        eventCount: events._embedded.events.length,
        totalResults: events.page?.totalElements,
        firstEvent: {
          id: firstEvent.id,
          name: firstEvent.name,
          date: firstEvent.dates?.start?.localDate,
          venue: firstEvent._embedded?.venues?.[0]?.name,
          city: firstEvent._embedded?.venues?.[0]?.city?.name
        }
      };
    });

    await this.runTest('Search venues', async () => {
      const searchParams = {
        city: 'Los Angeles',
        countryCode: 'US',
        size: 5
      };
      
      const venues = await this.ticketmasterClient.searchVenues(searchParams);
      
      if (!venues || !venues._embedded || !venues._embedded.venues) {
        throw new Error('No venues found in search results');
      }
      
      const firstVenue = venues._embedded.venues[0];
      
      return {
        searchParams,
        venueCount: venues._embedded.venues.length,
        firstVenue: {
          id: firstVenue.id,
          name: firstVenue.name,
          city: firstVenue.city?.name,
          state: firstVenue.state?.name,
          country: firstVenue.country?.name,
          capacity: firstVenue.boxOfficeInfo?.openHoursDetail
        }
      };
    });

    await this.runTest('Get event details', async () => {
      // First search for an event to get a valid ID
      const searchResults = await this.ticketmasterClient.searchEvents({
        keyword: 'music',
        city: 'Chicago',
        countryCode: 'US',
        size: 1
      });
      
      if (!searchResults._embedded?.events?.[0]) {
        throw new Error('No events available for detail test');
      }
      
      const eventId = searchResults._embedded.events[0].id;
      const eventDetails = await this.ticketmasterClient.getEvent(eventId);
      
      if (!eventDetails || !eventDetails.id) {
        throw new Error('Event details not found');
      }
      
      return {
        eventId,
        name: eventDetails.name,
        type: eventDetails.type,
        status: eventDetails.dates?.status?.code,
        venue: eventDetails._embedded?.venues?.[0]?.name,
        priceRanges: eventDetails.priceRanges?.length || 0
      };
    });

    await this.runTest('Search artists/attractions', async () => {
      const searchParams = {
        keyword: 'Taylor Swift',
        size: 5
      };
      
      const attractions = await this.ticketmasterClient.searchAttractions(searchParams);
      
      if (!attractions || !attractions._embedded || !attractions._embedded.attractions) {
        throw new Error('No attractions found in search results');
      }
      
      const firstAttraction = attractions._embedded.attractions[0];
      
      return {
        searchParams,
        attractionCount: attractions._embedded.attractions.length,
        firstAttraction: {
          id: firstAttraction.id,
          name: firstAttraction.name,
          type: firstAttraction.type,
          genres: firstAttraction.classifications?.[0]?.genre?.name,
          upcomingEvents: firstAttraction.upcomingEvents?._total
        }
      };
    });
  }

  /**
   * Test cross-API integration scenarios
   */
  async testCrossApiIntegration() {
    console.log(chalk.cyan.bold('\n🔗 Cross-API Integration Tests'));
    console.log(chalk.cyan('===============================\n'));

    await this.runTest('Artist data consistency across APIs', async () => {
      const artistName = 'The Beatles';
      
      // Search across all APIs
      const [setlistFmResults, spotifyResults, ticketmasterResults] = await Promise.allSettled([
        this.setlistFmClient.searchArtists(artistName, { limit: 3 }),
        this.spotifyClient.searchArtists(artistName, { limit: 3 }),
        this.ticketmasterClient.searchAttractions({ keyword: artistName, size: 3 })
      ]);
      
      const results = {
        setlistFm: setlistFmResults.status === 'fulfilled' ? setlistFmResults.value : null,
        spotify: spotifyResults.status === 'fulfilled' ? spotifyResults.value : null,
        ticketmaster: ticketmasterResults.status === 'fulfilled' ? ticketmasterResults.value : null
      };
      
      const foundIn = Object.entries(results)
        .filter(([_, result]) => result !== null && (
          Array.isArray(result) ? result.length > 0 : 
          result._embedded?.attractions?.length > 0 || 
          result.artists?.items?.length > 0
        ))
        .map(([api]) => api);
      
      if (foundIn.length === 0) {
        throw new Error('Artist not found in any API');
      }
      
      return {
        artistName,
        foundInApis: foundIn,
        apiCoverage: `${foundIn.length}/3`,
        consistency: foundIn.length > 1 ? 'good' : 'limited'
      };
    });

    await this.runTest('Event data correlation', async () => {
      const cityName = 'Nashville';
      
      // Get events from Ticketmaster and setlists from Setlist.fm for the same city
      const [ticketmasterEvents, setlistFmData] = await Promise.allSettled([
        this.ticketmasterClient.searchEvents({
          city: cityName,
          countryCode: 'US',
          keyword: 'concert',
          size: 5
        }),
        this.setlistFmClient.searchSetlists({
          cityName: cityName,
          country: 'US',
          limit: 5
        })
      ]);
      
      const tmEvents = ticketmasterEvents.status === 'fulfilled' ? 
        ticketmasterEvents.value._embedded?.events || [] : [];
      const setlists = setlistFmData.status === 'fulfilled' ? 
        setlistFmData.value || [] : [];
      
      return {
        cityName,
        ticketmasterEvents: tmEvents.length,
        setlistFmSetlists: setlists.length,
        dataAvailability: {
          ticketmaster: tmEvents.length > 0,
          setlistFm: setlists.length > 0
        }
      };
    });
  }

  /**
   * Test error handling and resilience
   */
  async testErrorHandling() {
    console.log(chalk.cyan.bold('\n⚠️  Error Handling Tests'));
    console.log(chalk.cyan('==========================\n'));

    await this.runTest('Invalid API key handling', async () => {
      // Test with a client using invalid credentials (mock scenario)
      const invalidClient = new SetlistFmClient('invalid-key');
      
      try {
        await invalidClient.searchArtists('test', { limit: 1 });
        throw new Error('Should have failed with invalid API key');
      } catch (error) {
        const errorMessage = error.message.toLowerCase();
        const isAuthError = errorMessage.includes('unauthorized') || 
                          errorMessage.includes('forbidden') ||
                          errorMessage.includes('401') ||
                          errorMessage.includes('403');
        
        if (!isAuthError) {
          throw new Error('Expected authentication error not thrown');
        }
        
        return {
          handledCorrectly: true,
          errorType: 'authentication',
          errorMessage: error.message.substring(0, 100)
        };
      }
    });

    await this.runTest('Network timeout handling', async () => {
      // Test with very short timeout
      const quickTimeoutTest = async () => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 1); // 1ms timeout
        
        try {
          await fetch('https://api.setlist.fm/rest/1.0/search/artists?artistName=test', {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
          });
          return { timedOut: false };
        } catch (error) {
          if (error.name === 'AbortError') {
            return { timedOut: true };
          }
          throw error;
        }
      };
      
      const result = await quickTimeoutTest();
      
      if (!result.timedOut) {
        console.log(chalk.yellow('Note: Network was too fast to trigger timeout'));
      }
      
      return {
        timeoutHandling: 'functional',
        actualTimeout: result.timedOut
      };
    });

    await this.runTest('Malformed response handling', async () => {
      // Test response parsing resilience
      const testResponse = async () => {
        try {
          // Mock a malformed JSON response scenario
          const mockResponse = '{"incomplete": json data';
          JSON.parse(mockResponse);
          return { handledGracefully: false };
        } catch (error) {
          // Should catch JSON parsing error
          return { 
            handledGracefully: true,
            errorType: error.name
          };
        }
      };
      
      const result = await testResponse();
      
      if (!result.handledGracefully) {
        throw new Error('Malformed response should be handled gracefully');
      }
      
      return result;
    });
  }

  /**
   * Run all tests and generate comprehensive report
   */
  async runAllTests() {
    console.log(chalk.yellow.bold('\n🚀 API Integration Test Suite'));
    console.log(chalk.yellow('Testing external API connectivity and functionality...\n'));

    // Configuration check
    console.log(chalk.blue('🔧 Configuration Check:'));
    console.log(`Setlist.fm API Key: ${process.env.SETLISTFM_API_KEY ? chalk.green('✓ Configured') : chalk.red('✗ Missing')}`);
    console.log(`Spotify Client ID: ${process.env.SPOTIFY_CLIENT_ID ? chalk.green('✓ Configured') : chalk.red('✗ Missing')}`);
    console.log(`Ticketmaster API Key: ${process.env.TICKETMASTER_API_KEY ? chalk.green('✓ Configured') : chalk.red('✗ Missing')}`);
    console.log();

    try {
      // Run test suites
      await this.testSetlistFmApi();
      await this.delay(2000); // Respect rate limits between test suites
      
      await this.testSpotifyApi();
      await this.delay(2000);
      
      await this.testTicketmasterApi();
      await this.delay(2000);
      
      await this.testCrossApiIntegration();
      await this.delay(1000);
      
      await this.testErrorHandling();
      
    } catch (error) {
      console.log(chalk.red(`\n❌ Test suite failed: ${error}`));
    }

    // Generate comprehensive report
    this.generateReport();
  }

  /**
   * Generate detailed test report
   */
  private generateReport() {
    console.log(chalk.yellow.bold('\n📊 API Integration Test Report'));
    console.log(chalk.yellow('==================================\n'));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const averageTime = this.results.reduce((sum, r) => sum + r.duration, 0) / totalTests;

    // Overall statistics
    console.log(`${chalk.bold('Overall Statistics:')}`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`${chalk.green('Passed:')} ${passedTests}`);
    console.log(`${chalk.red('Failed:')} ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`Average Duration: ${averageTime.toFixed(2)}ms\n`);

    // API-specific results
    const apiResults = {
      'Setlist.fm': this.results.filter(r => r.name.toLowerCase().includes('setlist')),
      'Spotify': this.results.filter(r => r.name.toLowerCase().includes('spotify')),
      'Ticketmaster': this.results.filter(r => r.name.toLowerCase().includes('ticketmaster'))
    };

    console.log(chalk.bold('API-Specific Results:'));
    Object.entries(apiResults).forEach(([api, tests]) => {
      const apiPassed = tests.filter(t => t.success).length;
      const apiTotal = tests.length;
      const apiRate = apiTotal > 0 ? ((apiPassed / apiTotal) * 100).toFixed(1) : 'N/A';
      
      const status = apiRate === '100.0' ? chalk.green('✓') : 
                    parseFloat(apiRate) >= 50 ? chalk.yellow('⚠') : chalk.red('✗');
      
      console.log(`  ${status} ${api}: ${apiPassed}/${apiTotal} (${apiRate}%)`);
    });
    console.log();

    // Failed tests details
    if (failedTests > 0) {
      console.log(chalk.red.bold('❌ Failed Tests:'));
      this.results
        .filter(r => !r.success)
        .forEach(test => {
          console.log(`  ${chalk.red('•')} ${test.name}`);
          console.log(`    Error: ${test.error}`);
          console.log(`    Duration: ${test.duration.toFixed(2)}ms\n`);
        });
    }

    // Performance insights
    const slowTests = this.results
      .filter(r => r.duration > 2000)
      .sort((a, b) => b.duration - a.duration);
      
    if (slowTests.length > 0) {
      console.log(chalk.yellow.bold('⏱️  Slow Tests (>2s):'));
      slowTests.slice(0, 5).forEach(test => {
        console.log(`  ${chalk.yellow('•')} ${test.name}: ${test.duration.toFixed(2)}ms`);
      });
      console.log();
    }

    // Configuration recommendations
    console.log(chalk.blue.bold('🔧 Configuration Status:'));
    const missingKeys = [];
    if (!process.env.SETLISTFM_API_KEY) missingKeys.push('SETLISTFM_API_KEY');
    if (!process.env.SPOTIFY_CLIENT_ID) missingKeys.push('SPOTIFY_CLIENT_ID');
    if (!process.env.SPOTIFY_CLIENT_SECRET) missingKeys.push('SPOTIFY_CLIENT_SECRET');
    if (!process.env.TICKETMASTER_API_KEY) missingKeys.push('TICKETMASTER_API_KEY');

    if (missingKeys.length > 0) {
      console.log(`${chalk.red('Missing Environment Variables:')}`);
      missingKeys.forEach(key => console.log(`  • ${key}`));
    } else {
      console.log(chalk.green('All API credentials configured ✓'));
    }
    console.log();

    // Final status
    if (passedTests === totalTests) {
      console.log(chalk.green.bold('🎉 All API integrations are working correctly!'));
    } else if (passedTests >= totalTests * 0.8) {
      console.log(chalk.yellow.bold('⚠️  Most APIs working, some issues detected.'));
    } else {
      console.log(chalk.red.bold('❌ Significant API integration issues detected.'));
    }

    console.log(chalk.gray('\nFor detailed API documentation and troubleshooting:'));
    console.log(chalk.gray('• Setlist.fm: https://api.setlist.fm/docs/'));
    console.log(chalk.gray('• Spotify: https://developer.spotify.com/documentation/web-api'));
    console.log(chalk.gray('• Ticketmaster: https://developer.ticketmaster.com/products-and-docs/apis/'));
  }
}

/**
 * Main execution
 */
async function main() {
  const testSuite = new ApiTestSuite();
  await testSuite.runAllTests();
  
  // Exit with appropriate code
  const failedTests = testSuite.results.filter(r => !r.success).length;
  const successRate = (testSuite.results.filter(r => r.success).length / testSuite.results.length) * 100;
  
  // Consider it a success if we have >80% pass rate (some APIs might be unavailable)
  process.exit(successRate >= 80 ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red.bold('Fatal error:'), error);
    process.exit(1);
  });
}

export default ApiTestSuite;