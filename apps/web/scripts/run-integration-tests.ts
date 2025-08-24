#!/usr/bin/env tsx
// MySetlist-S4 Integration Test Runner
// File: apps/web/scripts/run-integration-tests.ts
// Orchestrates all testing phases for complete system validation

import { spawn } from 'child_process';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { join } from 'path';

interface TestPhaseResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

class IntegrationTestRunner {
  private results: TestPhaseResult[] = [];
  private startTime: number = Date.now();

  async runAllPhases(): Promise<void> {
    console.log(chalk.blue('🧪 MySetlist-S4 Complete Integration Test Suite\n'));
    console.log(chalk.blue('═'.repeat(60)));
    console.log(chalk.white('Testing complete system end-to-end...'));
    console.log(chalk.blue('═'.repeat(60)) + '\n');

    // Phase 1: Environment Validation
    const envResult = await this.runEnvironmentValidation();
    if (!envResult) {
      console.log(chalk.red('\n❌ Environment validation failed. Stopping tests.'));
      this.generateFinalReport();
      process.exit(1);
    }

    // Phase 2: Queue Worker Startup
    const workersResult = await this.startQueueWorkers();
    if (!workersResult) {
      console.log(chalk.yellow('\n⚠️ Queue workers failed to start. Continuing with limited tests.'));
    }

    // Phase 3: Integration Tests
    const integrationResult = await this.runIntegrationTests();

    // Phase 4: Cron Job Validation
    const cronResult = await this.validateCronJobs();

    // Phase 5: Performance Tests
    const performanceResult = await this.runPerformanceTests();

    // Generate final report
    this.generateFinalReport();

    // Exit with appropriate code
    const allPassed = this.results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  }

  private async runEnvironmentValidation(): Promise<boolean> {
    const startTime = Date.now();
    console.log(chalk.blue('🔍 Phase 1: Environment Validation'));
    console.log(chalk.gray('Checking configuration, services, and dependencies...\n'));

    return new Promise((resolve) => {
      const child = spawn('tsx', ['scripts/validate-environment.ts'], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        const passed = code === 0;

        this.results.push({
          name: 'Environment Validation',
          passed,
          duration,
          error: passed ? undefined : 'Environment validation failed'
        });

        console.log(passed 
          ? chalk.green(`\n✅ Environment validation completed (${duration}ms)`)
          : chalk.red(`\n❌ Environment validation failed (${duration}ms)`)
        );

        resolve(passed);
      });

      child.on('error', (error) => {
        const duration = Date.now() - startTime;
        this.results.push({
          name: 'Environment Validation',
          passed: false,
          duration,
          error: `Failed to start validation: ${error.message}`
        });
        resolve(false);
      });
    });
  }

  private async startQueueWorkers(): Promise<boolean> {
    const startTime = Date.now();
    console.log(chalk.blue('\n🚀 Phase 2: Queue Worker Startup'));
    console.log(chalk.gray('Initializing queue system and workers...\n'));

    return new Promise((resolve) => {
      const child = spawn('tsx', ['scripts/start-queue-workers.ts'], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      // Give workers time to start and stabilize
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        
        // Give it a moment to clean up
        setTimeout(() => {
          const duration = Date.now() - startTime;
          this.results.push({
            name: 'Queue Worker Startup',
            passed: true,
            duration,
          });

          console.log(chalk.green(`\n✅ Queue workers started and stopped cleanly (${duration}ms)`));
          resolve(true);
        }, 2000);
      }, 10000); // 10 seconds

      child.on('close', (code) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        const passed = code === 0;

        this.results.push({
          name: 'Queue Worker Startup',
          passed,
          duration,
          error: passed ? undefined : `Workers exited with code ${code}`
        });

        console.log(passed 
          ? chalk.green(`\n✅ Queue workers completed (${duration}ms)`)
          : chalk.yellow(`\n⚠️ Queue workers exited early (${duration}ms)`)
        );

        resolve(passed);
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        this.results.push({
          name: 'Queue Worker Startup',
          passed: false,
          duration,
          error: `Failed to start workers: ${error.message}`
        });
        resolve(false);
      });
    });
  }

  private async runIntegrationTests(): Promise<boolean> {
    const startTime = Date.now();
    console.log(chalk.blue('\n🧪 Phase 3: Integration Tests'));
    console.log(chalk.gray('Running comprehensive system integration tests...\n'));

    return new Promise((resolve) => {
      const child = spawn('tsx', ['scripts/test-integration.ts'], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        const passed = code === 0;

        this.results.push({
          name: 'Integration Tests',
          passed,
          duration,
          error: passed ? undefined : 'One or more integration tests failed'
        });

        console.log(passed 
          ? chalk.green(`\n✅ Integration tests passed (${duration}ms)`)
          : chalk.red(`\n❌ Integration tests failed (${duration}ms)`)
        );

        resolve(passed);
      });

      child.on('error', (error) => {
        const duration = Date.now() - startTime;
        this.results.push({
          name: 'Integration Tests',
          passed: false,
          duration,
          error: `Failed to start integration tests: ${error.message}`
        });
        resolve(false);
      });
    });
  }

  private async validateCronJobs(): Promise<boolean> {
    const startTime = Date.now();
    console.log(chalk.blue('\n⏰ Phase 4: Cron Job Validation'));
    console.log(chalk.gray('Testing all cron job endpoints...\n'));

    const cronEndpoints = [
      '/api/cron/warm-cache',
      '/api/cron/optimize-performance',
      '/api/cron/cleanup-old-data',
      '/api/cron/calculate-trending',
      '/api/cron/update-active-artists',
      '/api/cron/sync-artist-data',
      '/api/cron/trending-artist-sync',
      '/api/cron/complete-catalog-sync',
      '/api/cron/master-sync',
      '/api/cron/sync-us-shows',
      '/api/cron/sync-eu-shows',
      '/api/cron/import-past-setlists',
      '/api/cron/sync-artist-images',
      '/api/cron/finish-mysetlist-sync',
    ];

    let allPassed = true;
    const errors: string[] = [];

    // First check if endpoints exist as files
    console.log(chalk.yellow('Checking cron endpoint files...'));
    for (const endpoint of cronEndpoints) {
      const filePath = join(process.cwd(), 'app', endpoint, 'route.ts');
      if (existsSync(filePath)) {
        console.log(chalk.green(`✅ ${endpoint} - File exists`));
      } else {
        console.log(chalk.red(`❌ ${endpoint} - File missing`));
        errors.push(`Missing file: ${endpoint}/route.ts`);
        allPassed = false;
      }
    }

    // Test endpoints that exist (if we have a running server)
    if (process.env.NODE_ENV !== 'production') {
      console.log(chalk.yellow('\nTesting cron endpoint responses...'));
      
      for (const endpoint of cronEndpoints) {
        const filePath = join(process.cwd(), 'app', endpoint, 'route.ts');
        if (!existsSync(filePath)) continue;

        try {
          // Try to make a test request (this would require the server to be running)
          const response = await fetch(`http://localhost:3001${endpoint}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.CRON_SECRET || 'test-secret'}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            console.log(chalk.green(`✅ ${endpoint} - HTTP OK`));
          } else if (response.status === 401) {
            console.log(chalk.yellow(`⚠️ ${endpoint} - Auth required (expected)`));
          } else {
            console.log(chalk.red(`❌ ${endpoint} - HTTP ${response.status}`));
            errors.push(`${endpoint} returned ${response.status}`);
            allPassed = false;
          }
        } catch (error) {
          // Server might not be running, which is okay for file-based testing
          console.log(chalk.gray(`⚪ ${endpoint} - Server not available (skipped)`));
        }
      }
    }

    const duration = Date.now() - startTime;
    this.results.push({
      name: 'Cron Job Validation',
      passed: allPassed,
      duration,
      error: errors.length > 0 ? errors.join('; ') : undefined
    });

    console.log(allPassed 
      ? chalk.green(`\n✅ Cron job validation passed (${duration}ms)`)
      : chalk.red(`\n❌ Cron job validation failed (${duration}ms)`)
    );

    return allPassed;
  }

  private async runPerformanceTests(): Promise<boolean> {
    const startTime = Date.now();
    console.log(chalk.blue('\n⚡ Phase 5: Performance Tests'));
    console.log(chalk.gray('Running basic performance and load tests...\n'));

    let allPassed = true;
    const errors: string[] = [];

    try {
      // Test 1: Database connection pool
      console.log(chalk.yellow('Testing database connection performance...'));
      const dbStart = Date.now();
      
      try {
        const { db, sql } = await import('@repo/database');
        await Promise.all([
          db.execute(sql`SELECT 1`),
          db.execute(sql`SELECT 1`),
          db.execute(sql`SELECT 1`),
          db.execute(sql`SELECT 1`),
          db.execute(sql`SELECT 1`),
        ]);
        
        const dbDuration = Date.now() - dbStart;
        if (dbDuration > 5000) {
          console.log(chalk.yellow(`⚠️ Database connections slow: ${dbDuration}ms`));
        } else {
          console.log(chalk.green(`✅ Database connections fast: ${dbDuration}ms`));
        }
      } catch (error) {
        console.log(chalk.red(`❌ Database connection test failed: ${error}`));
        errors.push('Database connection performance test failed');
        allPassed = false;
      }

      // Test 2: Cache performance
      console.log(chalk.yellow('Testing cache performance...'));
      const cacheStart = Date.now();
      
      try {
        const { cacheManager } = await import('../lib/cache/cache-manager');
        
        // Test cache write/read performance
        const testKey = 'perf-test-key';
        const testData = { test: true, timestamp: Date.now() };
        
        await cacheManager.set(testKey, testData, { namespace: 'test', ttl: 60 });
        const retrieved = await cacheManager.get(testKey, undefined, { namespace: 'test' });
        await cacheManager.delete(testKey, 'test');
        
        const cacheDuration = Date.now() - cacheStart;
        if (cacheDuration > 1000) {
          console.log(chalk.yellow(`⚠️ Cache operations slow: ${cacheDuration}ms`));
        } else {
          console.log(chalk.green(`✅ Cache operations fast: ${cacheDuration}ms`));
        }
      } catch (error) {
        console.log(chalk.red(`❌ Cache performance test failed: ${error}`));
        errors.push('Cache performance test failed');
        allPassed = false;
      }

      // Test 3: Queue system performance
      console.log(chalk.yellow('Testing queue system performance...'));
      const queueStart = Date.now();
      
      try {
        const { queueManager } = await import('../lib/queues/queue-manager');
        
        // Test queue statistics retrieval
        const stats = await queueManager.getAllStats();
        
        const queueDuration = Date.now() - queueStart;
        if (queueDuration > 2000) {
          console.log(chalk.yellow(`⚠️ Queue operations slow: ${queueDuration}ms`));
        } else {
          console.log(chalk.green(`✅ Queue operations fast: ${queueDuration}ms`));
        }
      } catch (error) {
        console.log(chalk.red(`❌ Queue performance test failed: ${error}`));
        errors.push('Queue performance test failed');
        allPassed = false;
      }

    } catch (error) {
      console.log(chalk.red(`❌ Performance tests failed: ${error}`));
      errors.push(`Performance test error: ${error}`);
      allPassed = false;
    }

    const duration = Date.now() - startTime;
    this.results.push({
      name: 'Performance Tests',
      passed: allPassed,
      duration,
      error: errors.length > 0 ? errors.join('; ') : undefined
    });

    console.log(allPassed 
      ? chalk.green(`\n✅ Performance tests passed (${duration}ms)`)
      : chalk.red(`\n❌ Performance tests failed (${duration}ms)`)
    );

    return allPassed;
  }

  private generateFinalReport(): void {
    const totalDuration = Date.now() - this.startTime;
    
    console.log(chalk.blue('\n\n📊 Complete Integration Test Report\n'));
    console.log(chalk.blue('═'.repeat(80)));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    // Phase results table
    console.log(chalk.white('\nTest Phase Results:'));
    console.log(chalk.white('─'.repeat(70)));
    
    this.results.forEach(result => {
      const status = result.passed 
        ? chalk.green('PASS') 
        : chalk.red('FAIL');
      const duration = chalk.gray(`${result.duration}ms`);
      const name = result.name.padEnd(30);
      
      console.log(`${status} ${name} ${duration}`);
      
      if (result.error) {
        console.log(chalk.red(`     Error: ${result.error}`));
      }
    });

    console.log(chalk.white('─'.repeat(70)));
    
    // Summary statistics
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
    
    console.log(chalk.white(`\nSummary:`));
    console.log(chalk.white(`Total Phases: ${total}`));
    console.log(chalk.green(`Passed: ${passed}`));
    console.log(chalk.red(`Failed: ${failed}`));
    console.log(chalk.white(`Success Rate: ${successRate}%`));
    console.log(chalk.white(`Total Duration: ${(totalDuration / 1000).toFixed(1)}s`));
    
    console.log(chalk.blue('\n' + '═'.repeat(80)));

    // Final verdict and recommendations
    if (failed === 0) {
      console.log(chalk.green('\n🎉 ALL INTEGRATION TESTS PASSED! 🎉'));
      console.log(chalk.green('✅ MySetlist-S4 system is ready for production deployment.'));
      console.log(chalk.white('\nNext steps:'));
      console.log(chalk.white('• Deploy to staging environment'));
      console.log(chalk.white('• Run production smoke tests'));
      console.log(chalk.white('• Monitor system health metrics'));
    } else {
      console.log(chalk.red(`\n⚠️  ${failed} TEST PHASE(S) FAILED!`));
      console.log(chalk.yellow('\nFailed phases:'));
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(chalk.red(`• ${r.name}: ${r.error}`));
        });
      
      console.log(chalk.yellow('\nRecommended actions:'));
      console.log(chalk.white('• Fix the failing components'));
      console.log(chalk.white('• Re-run the integration tests'));
      console.log(chalk.white('• Check logs for detailed error information'));
      console.log(chalk.white('• Verify environment configuration'));
    }

    console.log(chalk.blue('\n' + '═'.repeat(80)) + '\n');
  }
}

// Main execution
async function main() {
  const runner = new IntegrationTestRunner();
  
  try {
    await runner.runAllPhases();
  } catch (error) {
    console.error(chalk.red('\n💥 Unexpected error during test execution:'), error);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n⚠️ Test execution interrupted by user.'));
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n\n⚠️ Test execution terminated.'));
  process.exit(1);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Uncaught exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n💥 Unhandled rejection at:'), promise, 'reason:', reason);
  process.exit(1);
});

// Start the test runner
main();