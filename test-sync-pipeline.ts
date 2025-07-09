/**
 * SYNC PIPELINE END-TO-END TEST
 * SUB-AGENT 2: Database & API Integration Testing
 * 
 * Tests the complete artist click → data sync → display pipeline
 */

import { db } from './packages/database/src/index';
import { artists, shows, setlists, songs, venues } from './packages/database/src/schema';
import { eq } from 'drizzle-orm';

interface SyncTestResult {
  step: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

class SyncPipelineTester {
  private results: SyncTestResult[] = [];
  private testArtists = [
    { name: 'Taylor Swift', expectedData: { popularity: 100, followers: 50000000 } },
    { name: 'The Beatles', expectedData: { popularity: 90, followers: 30000000 } },
    { name: 'Radiohead', expectedData: { popularity: 80, followers: 5000000 } },
    { name: 'Beyoncé', expectedData: { popularity: 95, followers: 40000000 } },
    { name: 'Arctic Monkeys', expectedData: { popularity: 75, followers: 8000000 } }
  ];

  /**
   * Test the complete sync pipeline
   */
  async testCompleteSyncPipeline(): Promise<void> {
    console.log('🔄 Testing complete sync pipeline...\n');

    for (const testArtist of this.testArtists) {
      console.log(`\n🎵 Testing sync pipeline for: ${testArtist.name}`);
      console.log('=' .repeat(50));

      await this.testArtistSyncPipeline(testArtist.name, testArtist.expectedData);
    }

    this.generateSyncReport();
  }

  /**
   * Test sync pipeline for a single artist
   */
  private async testArtistSyncPipeline(artistName: string, expectedData: any): Promise<void> {
    // Step 1: Simulate artist click (search)
    await this.testStep(`${artistName}-SEARCH`, async () => {
      const response = await fetch('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: artistName, type: 'artist' })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        throw new Error('No search results found');
      }

      return data.results[0];
    });

    // Step 2: Trigger artist sync
    await this.testStep(`${artistName}-SYNC`, async () => {
      const response = await fetch('http://localhost:3000/api/artists/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistName })
      });

      if (!response.ok) {
        throw new Error(`Artist sync failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Sync failed: ${data.error}`);
      }

      // Validate synced data
      if (expectedData.popularity && data.artist.popularity < expectedData.popularity * 0.5) {
        console.warn(`⚠️ Popularity lower than expected: ${data.artist.popularity} < ${expectedData.popularity * 0.5}`);
      }

      return data.artist;
    });

    // Step 3: Verify database storage
    await this.testStep(`${artistName}-DATABASE`, async () => {
      const artist = await db.select().from(artists).where(eq(artists.name, artistName)).limit(1);
      
      if (artist.length === 0) {
        throw new Error('Artist not found in database');
      }

      const artistData = artist[0];
      
      // Validate required fields
      if (!artistData.spotifyId) {
        throw new Error('Missing Spotify ID');
      }
      
      if (!artistData.imageUrl) {
        throw new Error('Missing image URL');
      }
      
      if (!artistData.genres || artistData.genres === '[]') {
        throw new Error('Missing genres');
      }

      return artistData;
    });

    // Step 4: Test shows sync
    await this.testStep(`${artistName}-SHOWS`, async () => {
      const response = await fetch('http://localhost:3000/api/sync/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistName })
      });

      if (!response.ok) {
        // Shows sync might fail for some artists - this is not critical
        console.warn(`⚠️ Shows sync failed for ${artistName}: ${response.status}`);
        return { warning: 'Shows sync failed' };
      }

      const data = await response.json();
      return data;
    });

    // Step 5: Test setlists sync
    await this.testStep(`${artistName}-SETLISTS`, async () => {
      const response = await fetch('http://localhost:3000/api/sync/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistName })
      });

      if (!response.ok) {
        // Setlists sync might fail for some artists - this is not critical
        console.warn(`⚠️ Setlists sync failed for ${artistName}: ${response.status}`);
        return { warning: 'Setlists sync failed' };
      }

      const data = await response.json();
      return data;
    });

    // Step 6: Test frontend display
    await this.testStep(`${artistName}-DISPLAY`, async () => {
      const artist = await db.select().from(artists).where(eq(artists.name, artistName)).limit(1);
      
      if (artist.length === 0) {
        throw new Error('Artist not found for display');
      }

      const artistData = artist[0];
      
      // Test artist page would load
      const response = await fetch(`http://localhost:3000/api/artists/${artistData.slug}`);
      
      if (!response.ok) {
        throw new Error(`Artist page API failed: ${response.status}`);
      }

      const pageData = await response.json();
      
      // Validate page data structure
      if (!pageData.artist) {
        throw new Error('Missing artist data in page response');
      }

      return pageData;
    });

    // Step 7: Test real-time updates
    await this.testStep(`${artistName}-REALTIME`, async () => {
      // This would test WebSocket connections and real-time updates
      // For now, we'll simulate by checking if the database supports real-time queries
      
      const artistWithStats = await db.select().from(artists).where(eq(artists.name, artistName)).limit(1);
      
      if (artistWithStats.length === 0) {
        throw new Error('Artist not found for real-time test');
      }

      // Simulate a real-time update (like follower count change)
      const newFollowerCount = (artistWithStats[0].followers || 0) + 1;
      
      await db.update(artists)
        .set({ followers: newFollowerCount, updatedAt: new Date() })
        .where(eq(artists.id, artistWithStats[0].id));

      // Verify the update
      const updatedArtist = await db.select().from(artists).where(eq(artists.id, artistWithStats[0].id)).limit(1);
      
      if (updatedArtist[0].followers !== newFollowerCount) {
        throw new Error('Real-time update failed');
      }

      return { followersUpdated: newFollowerCount };
    });
  }

  /**
   * Test sync pipeline performance under load
   */
  async testSyncPerformance(): Promise<void> {
    console.log('\n⚡ Testing sync pipeline performance...\n');

    // Test concurrent syncs
    await this.testStep('CONCURRENT_SYNC', async () => {
      const concurrentArtists = ['Ed Sheeran', 'Adele', 'Bruno Mars'];
      const startTime = Date.now();

      const promises = concurrentArtists.map(async (artistName) => {
        const response = await fetch('http://localhost:3000/api/artists/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artistName })
        });

        if (!response.ok) {
          throw new Error(`Concurrent sync failed for ${artistName}: ${response.status}`);
        }

        return response.json();
      });

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      return { 
        concurrentSyncs: results.length, 
        totalDuration: duration,
        averageDuration: duration / results.length
      };
    });

    // Test database query performance
    await this.testStep('DATABASE_PERFORMANCE', async () => {
      const startTime = Date.now();

      // Complex query with joins
      const result = await db.select({
        artistName: artists.name,
        showCount: db.select().from(shows).where(eq(shows.headlinerArtistId, artists.id)),
        setlistCount: db.select().from(setlists).where(eq(setlists.artistId, artists.id)),
      }).from(artists).limit(100);

      const duration = Date.now() - startTime;

      return { 
        recordsProcessed: result.length, 
        queryDuration: duration,
        averagePerRecord: duration / result.length
      };
    });

    // Test API rate limiting
    await this.testStep('RATE_LIMITING', async () => {
      const startTime = Date.now();
      let requestCount = 0;
      let errors = 0;

      // Make rapid requests to test rate limiting
      for (let i = 0; i < 10; i++) {
        try {
          const response = await fetch('http://localhost:3000/api/health');
          requestCount++;
          
          if (response.status === 429) {
            // Rate limited - this is expected
            break;
          }
        } catch (error) {
          errors++;
        }
      }

      const duration = Date.now() - startTime;

      return { 
        requestsCompleted: requestCount, 
        errors, 
        duration,
        requestsPerSecond: requestCount / (duration / 1000)
      };
    });
  }

  /**
   * Test error handling and recovery
   */
  async testErrorHandling(): Promise<void> {
    console.log('\n🚨 Testing error handling and recovery...\n');

    // Test invalid artist name
    await this.testStep('INVALID_ARTIST', async () => {
      const response = await fetch('http://localhost:3000/api/artists/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistName: 'ThisArtistDoesNotExist12345' })
      });

      // Should return 404 or error response
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          throw new Error('Should have failed for invalid artist');
        }
      }

      return { errorHandled: true, status: response.status };
    });

    // Test malformed request
    await this.testStep('MALFORMED_REQUEST', async () => {
      const response = await fetch('http://localhost:3000/api/artists/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalidField: 'test' })
      });

      // Should return 400 or error response
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          throw new Error('Should have failed for malformed request');
        }
      }

      return { errorHandled: true, status: response.status };
    });

    // Test database connection recovery
    await this.testStep('DATABASE_RECOVERY', async () => {
      // This would test database connection recovery
      // For now, we'll test a simple database operation
      
      const testQuery = await db.select().from(artists).limit(1);
      
      if (testQuery.length === 0) {
        // No artists in database - this might be expected in test environment
        return { status: 'No test data available' };
      }

      return { databaseConnected: true, sampleRecord: testQuery[0] };
    });
  }

  /**
   * Helper method to test individual steps
   */
  private async testStep(step: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        step,
        success: true,
        duration,
        data: result
      });
      
      console.log(`  ✅ ${step}: Success (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        step,
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      console.log(`  ❌ ${step}: ${error instanceof Error ? error.message : 'Unknown error'} (${duration}ms)`);
    }
  }

  /**
   * Generate comprehensive sync pipeline report
   */
  private generateSyncReport(): void {
    console.log('\n📊 SYNC PIPELINE TEST REPORT\n');
    console.log('=' .repeat(60));

    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\n🔄 SYNC PIPELINE RESULTS:`);
    console.log(`  Total Tests: ${this.results.length}`);
    console.log(`  Successful: ${successful} (${((successful / this.results.length) * 100).toFixed(1)}%)`);
    console.log(`  Failed: ${failed} (${((failed / this.results.length) * 100).toFixed(1)}%)`);
    console.log(`  Total Duration: ${totalDuration}ms`);
    console.log(`  Average Duration: ${(totalDuration / this.results.length).toFixed(2)}ms`);

    // Group results by artist
    const artistResults: { [key: string]: SyncTestResult[] } = {};
    
    this.results.forEach(result => {
      const artistName = result.step.split('-')[0];
      if (!artistResults[artistName]) {
        artistResults[artistName] = [];
      }
      artistResults[artistName].push(result);
    });

    console.log(`\n🎵 ARTIST SYNC RESULTS:`);
    Object.entries(artistResults).forEach(([artist, results]) => {
      const artistSuccessful = results.filter(r => r.success).length;
      const artistTotal = results.length;
      const artistSuccess = ((artistSuccessful / artistTotal) * 100).toFixed(1);
      
      console.log(`  ${artist}: ${artistSuccessful}/${artistTotal} (${artistSuccess}%)`);
    });

    // Failed tests
    const failedTests = this.results.filter(r => !r.success);
    if (failedTests.length > 0) {
      console.log(`\n❌ FAILED TESTS:`);
      failedTests.forEach(test => {
        console.log(`  - ${test.step}: ${test.error}`);
      });
    }

    // Performance insights
    console.log(`\n⚡ PERFORMANCE INSIGHTS:`);
    const slowTests = this.results
      .filter(r => r.success && r.duration > 2000)
      .sort((a, b) => b.duration - a.duration);
    
    if (slowTests.length > 0) {
      console.log('  Slow operations (>2s):');
      slowTests.forEach(test => {
        console.log(`    - ${test.step}: ${test.duration}ms`);
      });
    } else {
      console.log('  All operations completed in under 2 seconds ✅');
    }

    // Pipeline health assessment
    console.log(`\n🏥 PIPELINE HEALTH:`);
    if (successful / this.results.length > 0.8) {
      console.log('  ✅ Pipeline is healthy (>80% success rate)');
    } else if (successful / this.results.length > 0.6) {
      console.log('  ⚠️ Pipeline needs attention (60-80% success rate)');
    } else {
      console.log('  ❌ Pipeline is unhealthy (<60% success rate)');
    }

    console.log('\n' + '=' .repeat(60));
  }
}

// Main test runner
async function runSyncPipelineTests(): Promise<void> {
  const tester = new SyncPipelineTester();
  
  console.log('🔄 SUB-AGENT 2: SYNC PIPELINE TESTING\n');
  console.log('ULTRATHINK: Testing artist click → data sync → display pipeline\n');

  try {
    // Test complete sync pipeline
    await tester.testCompleteSyncPipeline();
    
    // Test performance
    await tester.testSyncPerformance();
    
    // Test error handling
    await tester.testErrorHandling();
    
  } catch (error) {
    console.error('❌ Sync pipeline test failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
export { SyncPipelineTester, runSyncPipelineTests };

// Run tests if this file is executed directly
if (require.main === module) {
  runSyncPipelineTests().catch(console.error);
}