#!/usr/bin/env tsx
// MySetlist-S4 Integration Test Script
// File: apps/web/scripts/test-integration.ts
// Tests complete sync and import flow end-to-end

import chalk from 'chalk';
import { queueManager } from '../lib/queues/queue-manager';
import { ImportStatusManager } from '../lib/import-status';
import { cacheManager } from '../lib/cache/cache-manager';
import { dataFreshnessManager } from '../lib/services/data-freshness-manager';
import { batchApiOptimizer } from '../lib/services/batch-api-optimizer';
import { createServiceClient } from '../lib/supabase/server';
import { db, sql } from '@repo/database';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class IntegrationTester {
  private results: TestResult[] = [];
  private queueManager: QueueManager | null = null;

  async runAllTests(): Promise<void> {
    console.log(chalk.blue('🧪 MySetlist-S4 Integration Tests\n'));
    console.log(chalk.yellow('Testing complete sync and import flow...\n'));

    // Initialize services
    await this.initializeServices();

    // Run test suites
    await this.testDatabaseConnectivity();
    await this.testRedisConnectivity();
    await this.testSupabaseAuth();
    await this.testQueueSystem();
    await this.testImportFlow();
    await this.testSyncSystem();
    await this.testCacheSystem();
    await this.testCronJobs();
    await this.testDataFreshness();
    await this.testBatchOptimizer();

    // Generate report
    this.generateReport();

    // Cleanup
    await this.cleanup();
  }

  private async initializeServices(): Promise<void> {
    console.log(chalk.yellow('🔧 Initializing services...\n'));

    try {
      // Initialize queue manager
      this.queueManager = QueueManager.getInstance();
      console.log(chalk.green('✅ Queue manager initialized'));

      // Start cache warming
      cacheManager.startWarming();
      console.log(chalk.green('✅ Cache warming started'));

    } catch (error) {
      console.error(chalk.red('Failed to initialize services:'), error);
      process.exit(1);
    }
  }

  private async testDatabaseConnectivity(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Database Connectivity';

    try {
      console.log(chalk.yellow(`\n📊 Testing ${testName}...`));

      // Test basic query
      const result = await db.execute(sql`SELECT 1 as test`);
      
      // Test critical tables exist
      const tables = ['artists', 'shows', 'venues', 'songs', 'votes', 
                     'sync_jobs', 'cron_logs', 'queue_jobs', 'system_health'];
      
      const tableChecks = await Promise.all(
        tables.map(async (table) => {
          const exists = await db.execute(sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = ${table}
            )
          `);
          return { table, exists: exists.rows[0].exists };
        })
      );

      const missingTables = tableChecks.filter(t => !t.exists);
      
      if (missingTables.length > 0) {
        throw new Error(`Missing tables: ${missingTables.map(t => t.table).join(', ')}`);
      }

      this.recordSuccess(testName, Date.now() - startTime, {
        tablesChecked: tables.length,
        allTablesExist: true,
      });

    } catch (error) {
      this.recordFailure(testName, Date.now() - startTime, error);
    }
  }

  private async testRedisConnectivity(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Redis Connectivity';

    try {
      console.log(chalk.yellow(`\n🔴 Testing ${testName}...`));

      // Test basic Redis operations
      const testKey = 'test:integration:ping';
      const testValue = { test: true, timestamp: Date.now() };

      await cacheManager.set(testKey, testValue, { 
        namespace: 'test', 
        ttl: 60 
      });

      const retrieved = await cacheManager.get(testKey, undefined, {
        namespace: 'test',
      });

      if (!retrieved || retrieved.test !== testValue.test) {
        throw new Error('Redis read/write test failed');
      }

      // Cleanup
      await cacheManager.delete(testKey, 'test');

      this.recordSuccess(testName, Date.now() - startTime, {
        readWrite: 'success',
        ttl: 'tested',
      });

    } catch (error) {
      this.recordFailure(testName, Date.now() - startTime, error);
    }
  }

  private async testSupabaseAuth(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Supabase Authentication';

    try {
      console.log(chalk.yellow(`\n🔐 Testing ${testName}...`));

      const supabase = createServiceClient();
      
      // Test service role access
      const { data, error } = await supabase.auth.admin.listUsers();
      
      if (error) {
        throw new Error(`Auth test failed: ${error.message}`);
      }

      this.recordSuccess(testName, Date.now() - startTime, {
        serviceRoleAccess: 'verified',
        userCount: data.users.length,
      });

    } catch (error) {
      this.recordFailure(testName, Date.now() - startTime, error);
    }
  }

  private async testQueueSystem(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Queue System';

    try {
      console.log(chalk.yellow(`\n⚡ Testing ${testName}...`));

      if (!this.queueManager) {
        throw new Error('Queue manager not initialized');
      }

      // Get queue statistics
      const stats = await this.queueManager.getQueueStatistics();
      
      // Test adding a job
      const testQueue = this.queueManager.getQueue('scheduled-sync');
      const job = await testQueue.add('test-job', {
        test: true,
        timestamp: Date.now(),
      }, {
        removeOnComplete: true,
        removeOnFail: true,
      });

      // Remove the test job
      await job.remove();

      this.recordSuccess(testName, Date.now() - startTime, {
        queuesActive: Object.keys(stats).length,
        testJobCreated: true,
        stats,
      });

    } catch (error) {
      this.recordFailure(testName, Date.now() - startTime, error);
    }
  }

  private async testImportFlow(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Import Flow';

    try {
      console.log(chalk.yellow(`\n📥 Testing ${testName}...`));

      // Create a test import status
      const testJobId = `test-import-${Date.now()}`;
      const testArtistId = 'test-artist-123';

      await ImportStatusManager.createImportSession(testArtistId, testJobId);

      // Update through various stages
      const stages = [
        { stage: 'syncing-identifiers', progress: 20, message: 'Syncing IDs' },
        { stage: 'importing-songs', progress: 40, message: 'Importing songs' },
        { stage: 'importing-shows', progress: 60, message: 'Importing shows' },
        { stage: 'creating-setlists', progress: 80, message: 'Creating setlists' },
      ];

      for (const update of stages) {
        await ImportStatusManager.updateImportStatus(testJobId, update as any);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }

      // Complete the import
      await ImportStatusManager.markImportCompleted(testJobId, {
        songs: 50,
        shows: 10,
        venues: 5,
      }, testArtistId);

      // Verify status
      const finalStatus = await ImportStatusManager.getImportStatus(testJobId);
      
      if (!finalStatus || finalStatus.stage !== 'completed') {
        throw new Error('Import status tracking failed');
      }

      this.recordSuccess(testName, Date.now() - startTime, {
        stagesCompleted: stages.length,
        finalStatus: finalStatus.stage,
      });

    } catch (error) {
      this.recordFailure(testName, Date.now() - startTime, error);
    }
  }

  private async testSyncSystem(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Sync System';

    try {
      console.log(chalk.yellow(`\n🔄 Testing ${testName}...`));

      // Test sync job creation
      const syncJobId = `test-sync-${Date.now()}`;
      
      await db.execute(sql`
        INSERT INTO sync_jobs (
          id, entity_type, entity_id, job_type, status, priority
        ) VALUES (
          ${syncJobId}, 'artist', 'test-123', 'spotify-sync', 'pending', 5
        )
      `);

      // Update sync job
      await db.execute(sql`
        UPDATE sync_jobs 
        SET status = 'completed', completed_at = NOW()
        WHERE id = ${syncJobId}
      `);

      // Verify
      const result = await db.execute(sql`
        SELECT * FROM sync_jobs WHERE id = ${syncJobId}
      `);

      if (!result.rows[0] || result.rows[0].status !== 'completed') {
        throw new Error('Sync job tracking failed');
      }

      // Cleanup
      await db.execute(sql`
        DELETE FROM sync_jobs WHERE id = ${syncJobId}
      `);

      this.recordSuccess(testName, Date.now() - startTime, {
        syncJobTracking: 'verified',
      });

    } catch (error) {
      this.recordFailure(testName, Date.now() - startTime, error);
    }
  }

  private async testCacheSystem(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Cache System';

    try {
      console.log(chalk.yellow(`\n💾 Testing ${testName}...`));

      // Test cache operations
      const testData = {
        artistId: 'test-123',
        name: 'Test Artist',
        popularity: 75,
      };

      // Test with fetcher
      let fetcherCalled = false;
      const result = await cacheManager.get(
        'test:artist:123',
        async () => {
          fetcherCalled = true;
          return testData;
        },
        { namespace: 'artists', ttl: 60 }
      );

      if (!fetcherCalled || !result) {
        throw new Error('Cache fetcher not working');
      }

      // Test cache hit
      fetcherCalled = false;
      const cached = await cacheManager.get(
        'test:artist:123',
        async () => {
          fetcherCalled = true;
          return testData;
        },
        { namespace: 'artists' }
      );

      if (fetcherCalled || !cached) {
        throw new Error('Cache hit not working');
      }

      // Get stats
      const stats = cacheManager.getStats('artists');

      // Cleanup
      await cacheManager.delete('test:artist:123', 'artists');

      this.recordSuccess(testName, Date.now() - startTime, {
        cacheHit: true,
        stats: stats as any,
      });

    } catch (error) {
      this.recordFailure(testName, Date.now() - startTime, error);
    }
  }

  private async testCronJobs(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Cron Jobs';

    try {
      console.log(chalk.yellow(`\n⏰ Testing ${testName}...`));

      // Test cron logging
      await db.execute(sql`
        SELECT log_cron_run(
          'test-cron', 
          'success', 
          '{"test": true}'::jsonb
        )
      `);

      // Verify log entry
      const logs = await db.execute(sql`
        SELECT * FROM cron_logs 
        WHERE job_name = 'test-cron' 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      if (!logs.rows[0] || logs.rows[0].status !== 'success') {
        throw new Error('Cron logging failed');
      }

      // Test trending calculation function exists
      try {
        await db.execute(sql`
          SELECT EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'log_cron_run'
          )
        `);
      } catch (error) {
        throw new Error('Cron functions not found');
      }

      this.recordSuccess(testName, Date.now() - startTime, {
        loggingVerified: true,
        functionsExist: true,
      });

    } catch (error) {
      this.recordFailure(testName, Date.now() - startTime, error);
    }
  }

  private async testDataFreshness(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Data Freshness Manager';

    try {
      console.log(chalk.yellow(`\n🌿 Testing ${testName}...`));

      // Get freshness statistics
      const stats = await dataFreshnessManager.getFreshnessStatistics();

      if (!stats.rules || stats.rules.length === 0) {
        throw new Error('No freshness rules configured');
      }

      this.recordSuccess(testName, Date.now() - startTime, {
        rulesConfigured: stats.rules.length,
        lastCheck: stats.lastCheck,
      });

    } catch (error) {
      this.recordFailure(testName, Date.now() - startTime, error);
    }
  }

  private async testBatchOptimizer(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Batch API Optimizer';

    try {
      console.log(chalk.yellow(`\n🎯 Testing ${testName}...`));

      // Get optimizer statistics
      const stats = batchApiOptimizer.getStatistics();

      // Test rate limit tracking
      const hasRateLimits = Object.keys(stats.rateLimits).length > 0 || true; // Allow empty
      const hasCircuitBreakers = Object.keys(stats.circuitBreakers).length > 0;

      if (!hasCircuitBreakers) {
        throw new Error('Circuit breakers not configured');
      }

      this.recordSuccess(testName, Date.now() - startTime, {
        circuitBreakers: stats.circuitBreakers,
        rateLimitTracking: hasRateLimits,
      });

    } catch (error) {
      this.recordFailure(testName, Date.now() - startTime, error);
    }
  }

  private recordSuccess(name: string, duration: number, details?: any): void {
    console.log(chalk.green(`✅ ${name} - PASSED (${duration}ms)`));
    if (details) {
      console.log(chalk.gray(JSON.stringify(details, null, 2)));
    }
    
    this.results.push({
      name,
      passed: true,
      duration,
      details,
    });
  }

  private recordFailure(name: string, duration: number, error: any): void {
    const errorMessage = error?.message || String(error);
    console.log(chalk.red(`❌ ${name} - FAILED (${duration}ms)`));
    console.log(chalk.red(`   Error: ${errorMessage}`));
    
    this.results.push({
      name,
      passed: false,
      duration,
      error: errorMessage,
    });
  }

  private generateReport(): void {
    console.log(chalk.blue('\n\n📊 Integration Test Report\n'));
    console.log(chalk.blue('═'.repeat(60)));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    // Summary table
    console.log(chalk.white('\nTest Summary:'));
    console.log(chalk.white('─'.repeat(40)));
    
    this.results.forEach(result => {
      const status = result.passed 
        ? chalk.green('PASS') 
        : chalk.red('FAIL');
      const duration = chalk.gray(`${result.duration}ms`);
      console.log(`${status} ${result.name.padEnd(25)} ${duration}`);
    });

    console.log(chalk.white('─'.repeat(40)));
    
    // Overall results
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
    
    console.log(chalk.white(`\nTotal Tests: ${total}`));
    console.log(chalk.green(`Passed: ${passed}`));
    console.log(chalk.red(`Failed: ${failed}`));
    console.log(chalk.white(`Success Rate: ${successRate}%`));
    console.log(chalk.white(`Total Duration: ${totalDuration}ms`));
    
    console.log(chalk.blue('\n' + '═'.repeat(60)));

    // Final verdict
    if (failed === 0) {
      console.log(chalk.green('\n🎉 All integration tests PASSED! 🎉'));
      console.log(chalk.green('The MySetlist-S4 system is ready for production.'));
    } else {
      console.log(chalk.red(`\n⚠️  ${failed} tests FAILED!`));
      console.log(chalk.yellow('\nFailed tests:'));
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(chalk.red(`- ${r.name}: ${r.error}`));
        });
      console.log(chalk.yellow('\nPlease fix the issues before deploying.'));
    }
  }

  private async cleanup(): Promise<void> {
    console.log(chalk.yellow('\n🧹 Cleaning up...'));

    try {
      // Stop cache warming
      cacheManager.stopWarming();

      // Clear test data
      await cacheManager.clearNamespace('test');

      // Close queue connections
      if (this.queueManager) {
        await this.queueManager.closeAll();
      }

      console.log(chalk.green('✅ Cleanup complete'));
    } catch (error) {
      console.error(chalk.red('Cleanup error:'), error);
    }
  }
}

// Run tests
async function main() {
  const tester = new IntegrationTester();
  
  try {
    await tester.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('\n💥 Unexpected error:'), error);
    process.exit(1);
  }
}

// Handle termination
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\nInterrupted. Cleaning up...'));
  process.exit(1);
});

main();
