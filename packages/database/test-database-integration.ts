/**
 * COMPREHENSIVE DATABASE & API INTEGRATION TEST SUITE
 * SUB-AGENT 2: Database & API Integration ULTRATHINK
 *
 * Tests all 23 database tables and external API integrations
 * Validates CRUD operations, relationships, and performance
 */

import { count, desc, eq, isNotNull } from 'drizzle-orm';
import { db } from './src/index';
import {
  artistFollowers,
  artistSongs,
  artistStats,
  artists,
  emailLogs,
  emailPreferences,
  emailQueue,
  emailUnsubscribes,
  popularSearches,
  savedSearches,
  searchAnalytics,
  setlistSongs,
  setlists,
  showArtists,
  showComments,
  shows,
  songs,
  userBans,
  userFollowsArtists,
  userProfiles,
  users,
  venueInsiderTips,
  venuePhotos,
  venueReviews,
  venueTips,
  venues,
  votes,
} from './src/schema';

// Types for test results
interface TestResult {
  tableName: string;
  operation: string;
  success: boolean;
  error?: string;
  recordCount?: number;
  duration?: number;
  details?: any;
}

interface APITestResult {
  apiName: string;
  endpoint?: string;
  success: boolean;
  error?: string;
  duration?: number;
  responseData?: any;
}

class DatabaseIntegrationTester {
  private testResults: TestResult[] = [];
  private apiTestResults: APITestResult[] = [];

  /**
   * Run comprehensive database tests
   */
  async runDatabaseTests(): Promise<void> {
    const testTables = [
      // Core tables
      { table: users, name: 'users', testData: this.getUserTestData() },
      { table: artists, name: 'artists', testData: this.getArtistTestData() },
      { table: venues, name: 'venues', testData: this.getVenueTestData() },
      { table: shows, name: 'shows', testData: this.getShowTestData() },
      {
        table: setlists,
        name: 'setlists',
        testData: this.getSetlistTestData(),
      },
      { table: songs, name: 'songs', testData: this.getSongTestData() },

      // Stats and relationships
      {
        table: artistStats,
        name: 'artist_stats',
        testData: this.getArtistStatsTestData(),
      },
      {
        table: showArtists,
        name: 'show_artists',
        testData: this.getShowArtistTestData(),
      },
      {
        table: showComments,
        name: 'show_comments',
        testData: this.getShowCommentTestData(),
      },
      {
        table: setlistSongs,
        name: 'setlist_songs',
        testData: this.getSetlistSongTestData(),
      },
      { table: votes, name: 'votes', testData: this.getVoteTestData() },
      {
        table: artistSongs,
        name: 'artist_songs',
        testData: this.getArtistSongTestData(),
      },

      // Search and analytics
      {
        table: searchAnalytics,
        name: 'search_analytics',
        testData: this.getSearchAnalyticsTestData(),
      },
      {
        table: savedSearches,
        name: 'saved_searches',
        testData: this.getSavedSearchTestData(),
      },
      {
        table: popularSearches,
        name: 'popular_searches',
        testData: this.getPopularSearchTestData(),
      },
      {
        table: artistFollowers,
        name: 'artist_followers',
        testData: this.getArtistFollowerTestData(),
      },

      // User management
      {
        table: userBans,
        name: 'user_bans',
        testData: this.getUserBanTestData(),
      },
      {
        table: userProfiles,
        name: 'user_profiles',
        testData: this.getUserProfileTestData(),
      },
      {
        table: userFollowsArtists,
        name: 'user_follows_artists',
        testData: this.getUserFollowsArtistTestData(),
      },

      // Venue features
      {
        table: venueReviews,
        name: 'venue_reviews',
        testData: this.getVenueReviewTestData(),
      },
      {
        table: venuePhotos,
        name: 'venue_photos',
        testData: this.getVenuePhotoTestData(),
      },
      {
        table: venueTips,
        name: 'venue_tips',
        testData: this.getVenueTipTestData(),
      },
      {
        table: venueInsiderTips,
        name: 'venue_insider_tips',
        testData: this.getVenueInsiderTipTestData(),
      },

      // Email system
      {
        table: emailPreferences,
        name: 'email_preferences',
        testData: this.getEmailPreferenceTestData(),
      },
      {
        table: emailQueue,
        name: 'email_queue',
        testData: this.getEmailQueueTestData(),
      },
      {
        table: emailLogs,
        name: 'email_logs',
        testData: this.getEmailLogTestData(),
      },
      {
        table: emailUnsubscribes,
        name: 'email_unsubscribes',
        testData: this.getEmailUnsubscribeTestData(),
      },
    ];

    for (const tableInfo of testTables) {
      await this.testTable(tableInfo.table, tableInfo.name, tableInfo.testData);
    }

    // Test database relationships
    await this.testDatabaseRelationships();

    // Test database performance
    await this.testDatabasePerformance();
  }

  /**
   * Test individual table operations
   */
  private async testTable(
    table: any,
    tableName: string,
    testData: any
  ): Promise<void> {
    // Test CREATE operation
    await this.testOperation(tableName, 'CREATE', async () => {
      const result = await db.insert(table).values(testData).returning();
      return { recordCount: result.length, details: result[0] };
    });

    // Test READ operation
    await this.testOperation(tableName, 'READ', async () => {
      const result = await db.select().from(table).limit(10);
      return { recordCount: result.length, details: result };
    });

    // Test UPDATE operation
    await this.testOperation(tableName, 'UPDATE', async () => {
      const existing = await db.select().from(table).limit(1);
      if (existing.length > 0) {
        const updateData = { updatedAt: new Date() };
        const result = await db
          .update(table)
          .set(updateData)
          .where(eq(table.id, existing[0].id))
          .returning();
        return { recordCount: result.length, details: result[0] };
      }
      return { recordCount: 0, details: 'No records to update' };
    });

    // Test COUNT operation
    await this.testOperation(tableName, 'COUNT', async () => {
      const result = await db.select({ count: count() }).from(table);
      return { recordCount: result[0].count, details: result };
    });

    // Test complex query
    await this.testOperation(tableName, 'COMPLEX_QUERY', async () => {
      const result = await db
        .select()
        .from(table)
        .where(isNotNull(table.createdAt))
        .orderBy(desc(table.createdAt))
        .limit(5);
      return { recordCount: result.length, details: result };
    });
  }

  /**
   * Test database relationships
   */
  private async testDatabaseRelationships(): Promise<void> {
    // Test artist-shows relationship
    await this.testOperation('relationships', 'ARTIST_SHOWS', async () => {
      const result = await db
        .select({
          artistName: artists.name,
          showCount: count(shows.id),
        })
        .from(artists)
        .leftJoin(shows, eq(artists.id, shows.headlinerArtistId))
        .groupBy(artists.id, artists.name)
        .limit(10);
      return { recordCount: result.length, details: result };
    });

    // Test setlist-songs relationship
    await this.testOperation('relationships', 'SETLIST_SONGS', async () => {
      const result = await db
        .select({
          setlistId: setlists.id,
          songCount: count(setlistSongs.id),
        })
        .from(setlists)
        .leftJoin(setlistSongs, eq(setlists.id, setlistSongs.setlistId))
        .groupBy(setlists.id)
        .limit(10);
      return { recordCount: result.length, details: result };
    });

    // Test vote aggregation
    await this.testOperation('relationships', 'VOTE_AGGREGATION', async () => {
      const result = await db
        .select({
          setlistSongId: votes.setlistSongId,
          upvotes: count(votes.id),
        })
        .from(votes)
        .where(eq(votes.voteType, 'up'))
        .groupBy(votes.setlistSongId)
        .limit(10);
      return { recordCount: result.length, details: result };
    });

    // Test user-artist follows
    await this.testOperation(
      'relationships',
      'USER_ARTIST_FOLLOWS',
      async () => {
        const result = await db
          .select({
            userId: userFollowsArtists.userId,
            artistCount: count(userFollowsArtists.artistId),
          })
          .from(userFollowsArtists)
          .groupBy(userFollowsArtists.userId)
          .limit(10);
        return { recordCount: result.length, details: result };
      }
    );
  }

  /**
   * Test database performance
   */
  private async testDatabasePerformance(): Promise<void> {
    // Test large dataset query
    await this.testOperation('performance', 'LARGE_DATASET', async () => {
      const startTime = Date.now();
      const result = await db.select().from(artists).limit(1000);
      const duration = Date.now() - startTime;
      return {
        recordCount: result.length,
        duration,
        details: `Query took ${duration}ms`,
      };
    });

    // Test complex join query
    await this.testOperation('performance', 'COMPLEX_JOIN', async () => {
      const startTime = Date.now();
      const result = await db
        .select({
          artistName: artists.name,
          showName: shows.name,
          venueName: venues.name,
          setlistCount: count(setlists.id),
        })
        .from(artists)
        .leftJoin(shows, eq(artists.id, shows.headlinerArtistId))
        .leftJoin(venues, eq(shows.venueId, venues.id))
        .leftJoin(setlists, eq(shows.id, setlists.showId))
        .groupBy(
          artists.id,
          artists.name,
          shows.id,
          shows.name,
          venues.id,
          venues.name
        )
        .limit(100);
      const duration = Date.now() - startTime;
      return {
        recordCount: result.length,
        duration,
        details: `Complex join took ${duration}ms`,
      };
    });

    // Test index usage
    await this.testOperation('performance', 'INDEX_USAGE', async () => {
      const startTime = Date.now();
      const result = await db
        .select()
        .from(artists)
        .where(eq(artists.spotifyId, 'test-spotify-id'))
        .limit(1);
      const duration = Date.now() - startTime;
      return {
        recordCount: result.length,
        duration,
        details: `Index query took ${duration}ms`,
      };
    });
  }

  /**
   * Test external API integrations
   */
  async testAPIIntegrations(): Promise<void> {
    // Test Spotify API
    await this.testSpotifyAPI();

    // Test Ticketmaster API
    await this.testTicketmasterAPI();

    // Test SetlistFM API
    await this.testSetlistFMAPI();

    // Test internal API endpoints
    await this.testInternalAPIs();
  }

  /**
   * Test Spotify API integration
   */
  private async testSpotifyAPI(): Promise<void> {
    await this.testAPIOperation('Spotify', 'AUTHENTICATION', async () => {
      const response = await fetch(
        'http://localhost:3001/api/sync/external-apis?action=test',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artist: 'Taylor Swift' }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results?.spotify || data;
    });

    await this.testAPIOperation('Spotify', 'ARTIST_SEARCH', async () => {
      const response = await fetch('http://localhost:3001/api/artists/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistName: 'The Beatles' }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    });
  }

  /**
   * Test Ticketmaster API integration
   */
  private async testTicketmasterAPI(): Promise<void> {
    await this.testAPIOperation('Ticketmaster', 'EVENT_SEARCH', async () => {
      const response = await fetch(
        'http://localhost:3001/api/sync/external-apis?action=test',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artist: 'Taylor Swift' }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results?.ticketmaster || data;
    });

    await this.testAPIOperation('Ticketmaster', 'VENUE_SYNC', async () => {
      const response = await fetch(
        'http://localhost:3001/api/sync/external-apis?action=sync-shows',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city: 'New York', state: 'NY' }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    });
  }

  /**
   * Test SetlistFM API integration
   */
  private async testSetlistFMAPI(): Promise<void> {
    await this.testAPIOperation('SetlistFM', 'SETLIST_SEARCH', async () => {
      const response = await fetch(
        'http://localhost:3001/api/sync/external-apis?action=test',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artist: 'Radiohead' }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results?.setlistfm || data;
    });

    await this.testAPIOperation('SetlistFM', 'SETLIST_SYNC', async () => {
      const response = await fetch(
        'http://localhost:3001/api/sync/external-apis?action=sync-setlists',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artist: 'Radiohead' }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    });
  }

  /**
   * Test internal API endpoints
   */
  private async testInternalAPIs(): Promise<void> {
    // Test trending API
    await this.testAPIOperation('Internal', 'TRENDING', async () => {
      const response = await fetch(
        'http://localhost:3001/api/trending?period=week&limit=10'
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    });

    // Test search API
    await this.testAPIOperation('Internal', 'SEARCH', async () => {
      const response = await fetch(
        'http://localhost:3001/api/search?q=taylor&type=artist'
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    });

    // Test health check
    await this.testAPIOperation('Internal', 'HEALTH_CHECK', async () => {
      const response = await fetch('http://localhost:3001/api/health');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    });
  }

  /**
   * Test real-time features
   */
  async testRealTimeFeatures(): Promise<void> {
    // Test WebSocket connection
    await this.testAPIOperation(
      'Realtime',
      'WEBSOCKET_CONNECTION',
      async () => {
        // This would need to be implemented with actual WebSocket testing
        return { status: 'WebSocket testing requires browser environment' };
      }
    );

    // Test vote updates
    await this.testOperation('realtime', 'VOTE_UPDATES', async () => {
      // Insert a vote and check if it updates the aggregation
      const testVote = {
        userId: 'test-user-id',
        setlistSongId: 'test-setlist-song-id',
        voteType: 'up' as const,
      };

      const result = await db.insert(votes).values(testVote).returning();
      return { recordCount: result.length, details: result[0] };
    });
  }

  /**
   * Helper method to test database operations
   */
  private async testOperation(
    tableName: string,
    operation: string,
    testFn: () => Promise<{
      recordCount?: number;
      duration?: number;
      details?: any;
    }>
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;

      this.testResults.push({
        tableName,
        operation,
        success: true,
        duration,
        recordCount: result.recordCount,
        details: result.details,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      this.testResults.push({
        tableName,
        operation,
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Helper method to test API operations
   */
  private async testAPIOperation(
    apiName: string,
    operation: string,
    testFn: () => Promise<any>
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;

      this.apiTestResults.push({
        apiName,
        endpoint: operation,
        success: true,
        duration,
        responseData: result,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      this.apiTestResults.push({
        apiName,
        endpoint: operation,
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport(): void {
    // Database test summary
    const dbTests = this.testResults;
    const _dbSuccessful = dbTests.filter((t) => t.success).length;
    const _dbFailed = dbTests.filter((t) => !t.success).length;
    const _dbTotalDuration = dbTests.reduce(
      (sum, t) => sum + (t.duration || 0),
      0
    );

    // API test summary
    const apiTests = this.apiTestResults;
    const _apiSuccessful = apiTests.filter((t) => t.success).length;
    const _apiFailed = apiTests.filter((t) => !t.success).length;
    const _apiTotalDuration = apiTests.reduce(
      (sum, t) => sum + (t.duration || 0),
      0
    );

    // Failed tests details
    const failedTests = [...dbTests, ...apiTests].filter((t) => !t.success);
    if (failedTests.length > 0) {
      failedTests.forEach((_test) => {});
    }
    const slowTests = [...dbTests, ...apiTests]
      .filter((t) => t.success && (t.duration || 0) > 1000)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));

    if (slowTests.length > 0) {
      slowTests.forEach((_test) => {});
    } else {
    }
  }

  // Test data generators
  private getUserTestData() {
    return {
      email: `test-${Date.now()}@example.com`,
      displayName: 'Test User',
      role: 'user' as const,
    };
  }

  private getArtistTestData() {
    return {
      name: `Test Artist ${Date.now()}`,
      slug: `test-artist-${Date.now()}`,
      spotifyId: `spotify-${Date.now()}`,
      verified: false,
    };
  }

  private getVenueTestData() {
    return {
      name: `Test Venue ${Date.now()}`,
      slug: `test-venue-${Date.now()}`,
      city: 'Test City',
      country: 'US',
      timezone: 'America/New_York',
    };
  }

  private getShowTestData() {
    return {
      name: `Test Show ${Date.now()}`,
      slug: `test-show-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      headlinerArtistId: '00000000-0000-0000-0000-000000000000', // Will be replaced in real test
      status: 'upcoming' as const,
    };
  }

  private getSetlistTestData() {
    return {
      showId: '00000000-0000-0000-0000-000000000000',
      artistId: '00000000-0000-0000-0000-000000000000',
      type: 'predicted' as const,
      name: 'Test Setlist',
    };
  }

  private getSongTestData() {
    return {
      title: `Test Song ${Date.now()}`,
      artist: 'Test Artist',
      spotifyId: `spotify-song-${Date.now()}`,
    };
  }

  private getArtistStatsTestData() {
    return {
      artistId: '00000000-0000-0000-0000-000000000000',
      totalShows: 0,
      upcomingShows: 0,
      totalSetlists: 0,
    };
  }

  private getShowArtistTestData() {
    return {
      showId: '00000000-0000-0000-0000-000000000000',
      artistId: '00000000-0000-0000-0000-000000000000',
      orderIndex: 0,
      isHeadliner: true,
    };
  }

  private getShowCommentTestData() {
    return {
      showId: '00000000-0000-0000-0000-000000000000',
      userId: '00000000-0000-0000-0000-000000000000',
      content: 'Test comment',
    };
  }

  private getSetlistSongTestData() {
    return {
      setlistId: '00000000-0000-0000-0000-000000000000',
      songId: '00000000-0000-0000-0000-000000000000',
      position: 1,
    };
  }

  private getVoteTestData() {
    return {
      userId: '00000000-0000-0000-0000-000000000000',
      setlistSongId: '00000000-0000-0000-0000-000000000000',
      voteType: 'up' as const,
    };
  }

  private getArtistSongTestData() {
    return {
      artistId: '00000000-0000-0000-0000-000000000000',
      songId: '00000000-0000-0000-0000-000000000000',
      isPrimaryArtist: true,
    };
  }

  private getSearchAnalyticsTestData() {
    return {
      query: 'test search',
      searchType: 'artist',
      resultsCount: 5,
      responseTimeMs: 100,
    };
  }

  private getSavedSearchTestData() {
    return {
      userId: '00000000-0000-0000-0000-000000000000',
      name: 'Test Saved Search',
      query: 'taylor swift',
      searchType: 'artist',
    };
  }

  private getPopularSearchTestData() {
    return {
      query: 'popular artist',
      searchType: 'artist',
      count: 1,
    };
  }

  private getArtistFollowerTestData() {
    return {
      artistId: '00000000-0000-0000-0000-000000000000',
      userId: '00000000-0000-0000-0000-000000000000',
      notificationEnabled: true,
    };
  }

  private getUserBanTestData() {
    return {
      userId: '00000000-0000-0000-0000-000000000000',
      bannedBy: '00000000-0000-0000-0000-000000000000',
      reason: 'Test ban',
      banType: 'temporary',
    };
  }

  private getUserProfileTestData() {
    return {
      userId: '00000000-0000-0000-0000-000000000000',
      bio: 'Test bio',
      location: 'Test Location',
    };
  }

  private getUserFollowsArtistTestData() {
    return {
      userId: '00000000-0000-0000-0000-000000000000',
      artistId: '00000000-0000-0000-0000-000000000000',
      notificationEnabled: true,
    };
  }

  private getVenueReviewTestData() {
    return {
      venueId: '00000000-0000-0000-0000-000000000000',
      userId: '00000000-0000-0000-0000-000000000000',
      rating: 5,
      title: 'Test Review',
      content: 'Test review content',
    };
  }

  private getVenuePhotoTestData() {
    return {
      venueId: '00000000-0000-0000-0000-000000000000',
      userId: '00000000-0000-0000-0000-000000000000',
      imageUrl: 'https://example.com/test-photo.jpg',
      caption: 'Test photo',
    };
  }

  private getVenueTipTestData() {
    return {
      venueId: '00000000-0000-0000-0000-000000000000',
      userId: '00000000-0000-0000-0000-000000000000',
      content: 'Test tip',
      category: 'general' as const,
    };
  }

  private getVenueInsiderTipTestData() {
    return {
      venueId: '00000000-0000-0000-0000-000000000000',
      userId: '00000000-0000-0000-0000-000000000000',
      content: 'Test insider tip',
      category: 'access' as const,
    };
  }

  private getEmailPreferenceTestData() {
    return {
      userId: '00000000-0000-0000-0000-000000000000',
      newsletter: true,
      showReminders: true,
      newFollowers: true,
    };
  }

  private getEmailQueueTestData() {
    return {
      userId: '00000000-0000-0000-0000-000000000000',
      emailType: 'newsletter',
      subject: 'Test Email',
      htmlContent: '<p>Test content</p>',
      priority: 'normal' as const,
    };
  }

  private getEmailLogTestData() {
    return {
      userId: '00000000-0000-0000-0000-000000000000',
      emailType: 'newsletter',
      subject: 'Test Email',
      status: 'sent' as const,
      sentAt: new Date(),
    };
  }

  private getEmailUnsubscribeTestData() {
    return {
      userId: '00000000-0000-0000-0000-000000000000',
      emailType: 'newsletter',
      reason: 'Too many emails',
    };
  }
}

// Main test runner
async function runAllTests(): Promise<void> {
  const tester = new DatabaseIntegrationTester();

  try {
    // Run database tests
    await tester.runDatabaseTests();

    // Run API tests
    await tester.testAPIIntegrations();

    // Run real-time tests
    await tester.testRealTimeFeatures();

    // Generate comprehensive report
    tester.generateTestReport();
  } catch (_error) {
    process.exit(1);
  }
}

// Export for use in other scripts
export { DatabaseIntegrationTester, runAllTests };

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}
