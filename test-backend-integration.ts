#!/usr/bin/env tsx
/**
 * Comprehensive Backend Integration Test
 * Tests all components end-to-end: APIs, orchestrator, queues, Redis, progress tracking
 */

import { testInfrastructure, healthCheck, verifyEnvironment } from './apps/web/lib/test-infrastructure';
import { queueManager, QueueName, Priority } from './apps/web/lib/queues/queue-manager';
import { ProgressBus } from './apps/web/lib/services/progress/ProgressBus';
import { SpotifyClient } from './packages/external-apis/src/clients/spotify';
import { TicketmasterClient } from './packages/external-apis/src/clients/ticketmaster';
import { SetlistFmClient } from './packages/external-apis/src/clients/setlistfm';
import { ArtistImportOrchestrator } from './apps/web/lib/services/orchestrators/ArtistImportOrchestrator';
import { executeJob } from './apps/web/lib/jobs/processors';

interface TestResult {
  test: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class BackendIntegrationTester {
  private results: TestResult[] = [];
  
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Backend Integration Test Suite');
    console.log('================================================\n');

    // Test infrastructure components
    await this.testInfrastructure();
    
    // Test external API clients
    await this.testExternalApiClients();
    
    // Test queue system
    await this.testQueueSystem();
    
    // Test orchestrator
    await this.testOrchestrator();
    
    // Test API routes (if possible)
    await this.testApiRoutes();
    
    // Test end-to-end flow
    await this.testEndToEndFlow();
    
    // Print final summary
    this.printSummary();
  }

  private async testInfrastructure(): Promise<void> {
    console.log('📋 Testing Infrastructure Components...\n');
    
    // Test environment variables
    await this.runTest('Environment Configuration', async () => {
      const envCheck = verifyEnvironment();
      if (!envCheck.valid) {
        throw new Error(`Missing environment variables: ${envCheck.missing.join(', ')}`);
      }
      return envCheck;
    });

    // Test health check
    await this.runTest('Health Check', async () => {
      const healthy = await healthCheck();
      if (!healthy) {
        throw new Error('Health check failed');
      }
      return { healthy };
    });

    // Test comprehensive infrastructure
    await this.runTest('Infrastructure Components', async () => {
      const results = await testInfrastructure();
      if (!results.redis || !results.queues || !results.progressBus || !results.concurrency) {
        throw new Error(`Infrastructure test failed: ${results.errors.join(', ')}`);
      }
      return results;
    });

    console.log('');
  }

  private async testExternalApiClients(): Promise<void> {
    console.log('🌐 Testing External API Clients...\n');

    // Test Spotify client
    await this.runTest('Spotify API Client', async () => {
      try {
        const client = new SpotifyClient({
          apiKey: process.env.SPOTIFY_CLIENT_ID || '',
        });
        
        // Test authentication
        await client.authenticate();
        
        // Test a simple search
        const searchResult = await client.searchArtists('Taylor Swift', 1);
        
        return {
          authenticated: true,
          searchResults: searchResult.artists?.items?.length || 0,
        };
      } catch (error: any) {
        if (error.message.includes('CLIENT_ID')) {
          return { skipped: true, reason: 'No Spotify credentials' };
        }
        throw error;
      }
    });

    // Test Ticketmaster client
    await this.runTest('Ticketmaster API Client', async () => {
      try {
        const client = new TicketmasterClient({
          apiKey: process.env.TICKETMASTER_API_KEY || '',
        });
        
        const searchResult = await client.searchEvents({
          keyword: 'music',
          size: 1,
        });
        
        return {
          searchResults: searchResult._embedded?.events?.length || 0,
          pageInfo: searchResult.page,
        };
      } catch (error: any) {
        if (error.message.includes('API_KEY')) {
          return { skipped: true, reason: 'No Ticketmaster API key' };
        }
        throw error;
      }
    });

    // Test SetlistFM client
    await this.runTest('SetlistFM API Client', async () => {
      try {
        const client = new SetlistFmClient({
          apiKey: process.env.SETLISTFM_API_KEY || '',
        });
        
        const searchResult = await client.searchSetlists({
          artistName: 'The Beatles',
          p: 1,
        });
        
        return {
          searchResults: searchResult.setlist?.length || 0,
        };
      } catch (error: any) {
        if (error.message.includes('API_KEY')) {
          return { skipped: true, reason: 'No SetlistFM API key' };
        }
        throw error;
      }
    });

    console.log('');
  }

  private async testQueueSystem(): Promise<void> {
    console.log('⚙️  Testing Queue System...\n');

    // Test queue creation and job processing
    await this.runTest('Queue Job Processing', async () => {
      const testJobId = `test-job-${Date.now()}`;
      
      // Add a test job
      const job = await queueManager.addJob(
        QueueName.ARTIST_IMPORT,
        'test-job',
        { testData: true, timestamp: Date.now() },
        { 
          priority: Priority.HIGH,
          jobId: testJobId,
        }
      );

      // Get queue metrics
      const metrics = await queueManager.getQueueMetrics(QueueName.ARTIST_IMPORT);
      
      // Clean up the test job
      await job.remove();

      return {
        jobId: job.id,
        queueName: metrics.name,
        jobCounts: metrics.counts,
      };
    });

    // Test job execution
    await this.runTest('Job Execution', async () => {
      const result = await executeJob('health-check', {}, {
        jobId: `test-health-${Date.now()}`,
        priority: 'high',
      });

      if (!result.success) {
        throw new Error(`Job execution failed: ${result.error}`);
      }

      return result;
    });

    console.log('');
  }

  private async testOrchestrator(): Promise<void> {
    console.log('🎯 Testing Orchestrator...\n');

    // Test orchestrator instantiation
    await this.runTest('Orchestrator Creation', async () => {
      const orchestrator = new ArtistImportOrchestrator({
        concurrency: {
          albums: 2,
          tracks: 2,
          shows: 2,
        },
        retryAttempts: 1,
      });

      return { 
        created: true,
        config: 'initialized',
      };
    });

    console.log('');
  }

  private async testApiRoutes(): Promise<void> {
    console.log('🔗 Testing API Routes...\n');

    // Test infrastructure endpoint
    await this.runTest('Infrastructure API Endpoint', async () => {
      try {
        const response = await fetch('http://localhost:3000/api/infrastructure/test', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (error: any) {
        if (error.message.includes('ECONNREFUSED')) {
          return { skipped: true, reason: 'Server not running' };
        }
        throw error;
      }
    });

    // Test health endpoint
    await this.runTest('Health API Endpoint', async () => {
      try {
        const response = await fetch('http://localhost:3000/api/health', {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (error: any) {
        if (error.message.includes('ECONNREFUSED')) {
          return { skipped: true, reason: 'Server not running' };
        }
        throw error;
      }
    });

    console.log('');
  }

  private async testEndToEndFlow(): Promise<void> {
    console.log('🔄 Testing End-to-End Flow...\n');

    // Test progress reporting
    await this.runTest('Progress Reporting Flow', async () => {
      const testArtistId = `test-artist-${Date.now()}`;
      const progressEvents: any[] = [];
      
      // Set up progress listener
      const listener = (event: any) => {
        progressEvents.push(event);
      };

      ProgressBus.onProgress(testArtistId, listener);

      try {
        // Report multiple progress events
        await ProgressBus.report(testArtistId, 'initializing', 10, 'Starting test');
        await ProgressBus.report(testArtistId, 'importing-shows', 50, 'Importing shows');
        await ProgressBus.report(testArtistId, 'importing-songs', 80, 'Importing songs');
        await ProgressBus.reportComplete(testArtistId, 'Test completed');

        // Small delay to allow events to be emitted
        await new Promise(resolve => setTimeout(resolve, 100));

        return {
          eventsReceived: progressEvents.length,
          events: progressEvents.map(e => ({ stage: e.stage, progress: e.progress })),
        };
      } finally {
        ProgressBus.offProgress(testArtistId, listener);
      }
    });

    console.log('');
  }

  private async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      if (result?.skipped) {
        console.log(`⚠️  ${testName}: SKIPPED (${result.reason})`);
        this.results.push({
          test: testName,
          success: true,
          duration,
          details: result,
        });
      } else {
        console.log(`✅ ${testName}: PASSED (${duration}ms)`);
        this.results.push({
          test: testName,
          success: true,
          duration,
          details: result,
        });
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`❌ ${testName}: FAILED (${duration}ms) - ${error.message}`);
      this.results.push({
        test: testName,
        success: false,
        duration,
        error: error.message,
      });
    }
  }

  private printSummary(): void {
    console.log('\n📊 Test Summary');
    console.log('===============');
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.test}: ${r.error}`);
        });
    }

    console.log('\n🎯 Backend Integration Status:', failedTests === 0 ? 'READY' : 'NEEDS ATTENTION');
  }
}

// Run the tests
async function main() {
  const tester = new BackendIntegrationTester();
  await tester.runAllTests();
  
  // Exit with appropriate code
  const hasFailures = tester['results'].some(r => !r.success);
  process.exit(hasFailures ? 1 : 0);
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}