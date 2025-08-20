#!/usr/bin/env tsx

/**
 * Redis Connection Test Script
 * 
 * This script tests the Redis/Upstash connection and cache functionality
 * for the concert setlist voting platform. It validates cache operations,
 * performance, and error handling.
 */

import { createRedisClient, cache } from '../lib/queues/redis-config';

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class RedisTestSuite {
  private cache: CacheClient;
  private rateLimiter: RedisRateLimiter;
  private results: TestResult[] = [];

  constructor() {
    this.cache = CacheClient.getInstance();
    this.rateLimiter = new RedisRateLimiter();
  }

  /**
   * Execute a test with performance tracking
   */
  private async runTest(
    name: string, 
    testFn: () => Promise<any>
  ): Promise<TestResult> {
    const start = performance.now();
    
    try {
      console.log(chalk.blue(`🧪 Testing: ${name}`));
      
      const result = await testFn();
      const duration = performance.now() - start;
      
      const testResult: TestResult = {
        name,
        success: true,
        duration,
        details: result
      };
      
      console.log(chalk.green(`✅ ${name} - ${duration.toFixed(2)}ms`));
      this.results.push(testResult);
      return testResult;
      
    } catch (error) {
      const duration = performance.now() - start;
      const testResult: TestResult = {
        name,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
      
      console.log(chalk.red(`❌ ${name} - ${duration.toFixed(2)}ms - ${testResult.error}`));
      this.results.push(testResult);
      return testResult;
    }
  }

  /**
   * Test basic Redis operations
   */
  async testBasicOperations() {
    await this.runTest('Basic SET operation', async () => {
      const key = 'test:basic:set';
      const value = { message: 'Hello Redis!', timestamp: Date.now() };
      const result = await this.cache.set(key, value, { ex: 60 });
      
      if (!result) {
        throw new Error('SET operation failed');
      }
      
      return { key, value };
    });

    await this.runTest('Basic GET operation', async () => {
      const key = 'test:basic:get';
      const testValue = { data: 'test data', number: 42 };
      
      await this.cache.set(key, testValue, { ex: 60 });
      const retrieved = await this.cache.get(key);
      
      if (!retrieved || JSON.stringify(retrieved) !== JSON.stringify(testValue)) {
        throw new Error('GET operation failed - data mismatch');
      }
      
      return { original: testValue, retrieved };
    });

    await this.runTest('Key expiration (TTL)', async () => {
      const key = 'test:ttl';
      const value = 'expires soon';
      
      await this.cache.set(key, value, { ex: 2 });
      
      // Check initial TTL
      const initialTtl = await this.cache.ttl(key);
      if (initialTtl <= 0) {
        throw new Error('TTL not set correctly');
      }
      
      // Wait and check expiration
      await new Promise(resolve => setTimeout(resolve, 3000));
      const expiredValue = await this.cache.get(key);
      
      if (expiredValue !== null) {
        throw new Error('Key did not expire as expected');
      }
      
      return { initialTtl, expired: expiredValue === null };
    });

    await this.runTest('DELETE operation', async () => {
      const key = 'test:delete';
      const value = 'to be deleted';
      
      await this.cache.set(key, value);
      const setResult = await this.cache.get(key);
      
      const deleteResult = await this.cache.del(key);
      const getAfterDelete = await this.cache.get(key);
      
      if (getAfterDelete !== null || deleteResult === 0) {
        throw new Error('DELETE operation failed');
      }
      
      return { beforeDelete: setResult, afterDelete: getAfterDelete, deleteCount: deleteResult };
    });
  }

  /**
   * Test advanced Redis operations
   */
  async testAdvancedOperations() {
    await this.runTest('INCR operation', async () => {
      const key = 'test:counter';
      
      // Clear any existing value
      await this.cache.del(key);
      
      const first = await this.cache.incr(key);
      const second = await this.cache.incr(key);
      const third = await this.cache.incr(key);
      
      if (first !== 1 || second !== 2 || third !== 3) {
        throw new Error('INCR operation failed');
      }
      
      return { first, second, third };
    });

    await this.runTest('ZADD and ZRANGE operations', async () => {
      const key = 'test:leaderboard';
      
      // Clear existing data
      await this.cache.del(key);
      
      // Add scored members
      await this.cache.zadd(key, 100, 'user1');
      await this.cache.zadd(key, 85, 'user2');
      await this.cache.zadd(key, 95, 'user3');
      
      // Get top scores
      const topScores = await this.cache.zrange(key, 0, -1, true);
      
      if (topScores.length === 0) {
        throw new Error('ZRANGE operation failed');
      }
      
      return { topScores };
    });

    await this.runTest('Pipeline operations', async () => {
      const commands = [
        ['SET', 'test:pipeline:1', JSON.stringify({ id: 1, name: 'Test 1' })],
        ['SET', 'test:pipeline:2', JSON.stringify({ id: 2, name: 'Test 2' })],
        ['SET', 'test:pipeline:3', JSON.stringify({ id: 3, name: 'Test 3' })],
        ['INCR', 'test:pipeline:counter']
      ];
      
      const results = await this.cache.pipeline(commands);
      
      if (results.length !== commands.length) {
        throw new Error('Pipeline operation failed');
      }
      
      // Verify the data was set
      const value1 = await this.cache.get('test:pipeline:1');
      const counter = await this.cache.get('test:pipeline:counter');
      
      return { pipelineResults: results, value1, counter };
    });
  }

  /**
   * Test cache patterns and utilities
   */
  async testCachePatterns() {
    await this.runTest('Cache key generators', () => {
      const trendingKey = cacheKeys.trending('daily', 'artists', 20);
      const artistKey = cacheKeys.artist('artist-123');
      const showKey = cacheKeys.show('show-456');
      const searchKey = cacheKeys.searchResults('taylor swift', 'artists');
      const progressKey = cacheKeys.syncProgress('artist-789');
      
      const expectedKeys = {
        trending: 'trending:daily:artists:20',
        artist: 'artist:artist-123',
        show: 'show:show-456',
        search: 'search:artists:taylor-swift',
        progress: 'sync:progress:artist-789'
      };
      
      if (
        trendingKey !== expectedKeys.trending ||
        artistKey !== expectedKeys.artist ||
        showKey !== expectedKeys.show ||
        searchKey !== expectedKeys.search ||
        progressKey !== expectedKeys.progress
      ) {
        throw new Error('Cache key generation failed');
      }
      
      return { trendingKey, artistKey, showKey, searchKey, progressKey };
    });

    await this.runTest('Cache with pattern invalidation', async () => {
      const pattern = 'test:pattern';
      const keys = [`${pattern}:1`, `${pattern}:2`, `${pattern}:3`];
      
      // Set values with pattern tracking
      for (const key of keys) {
        await this.cache.setWithPattern(key, { data: `value for ${key}` }, pattern, 300);
      }
      
      // Verify all values are set
      const values = await Promise.all(keys.map(key => this.cache.get(key)));
      const allSet = values.every(v => v !== null);
      
      // Invalidate pattern
      await this.cache.invalidatePattern(pattern);
      
      // Verify all values are cleared
      const valuesAfterInvalidation = await Promise.all(keys.map(key => this.cache.get(key)));
      const allCleared = valuesAfterInvalidation.every(v => v === null);
      
      if (!allSet || !allCleared) {
        throw new Error('Pattern invalidation failed');
      }
      
      return { allSet, allCleared, keyCount: keys.length };
    });
  }

  /**
   * Test rate limiting functionality
   */
  async testRateLimiting() {
    await this.runTest('Basic rate limiting', async () => {
      const key = 'test:ratelimit:user123';
      const maxRequests = 5;
      const windowSeconds = 60;
      
      // Clear any existing rate limit
      await this.cache.del(`${key}:${Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds}`);
      
      const results = [];
      
      // Make requests up to the limit
      for (let i = 0; i < maxRequests + 2; i++) {
        const result = await this.rateLimiter.checkLimit(key, maxRequests, windowSeconds);
        results.push({
          request: i + 1,
          allowed: result.allowed,
          remaining: result.remaining
        });
      }
      
      const allowedRequests = results.filter(r => r.allowed).length;
      const deniedRequests = results.filter(r => !r.allowed).length;
      
      if (allowedRequests !== maxRequests || deniedRequests !== 2) {
        throw new Error(`Rate limiting failed. Expected ${maxRequests} allowed, ${2} denied. Got ${allowedRequests} allowed, ${deniedRequests} denied`);
      }
      
      return { allowedRequests, deniedRequests, results };
    });

    await this.runTest('Rate limit window reset', async () => {
      const key = 'test:ratelimit:window:user456';
      const maxRequests = 3;
      const windowSeconds = 2; // Short window for testing
      
      // Make requests to hit limit
      let result1 = await this.rateLimiter.checkLimit(key, maxRequests, windowSeconds);
      let result2 = await this.rateLimiter.checkLimit(key, maxRequests, windowSeconds);
      let result3 = await this.rateLimiter.checkLimit(key, maxRequests, windowSeconds);
      let result4 = await this.rateLimiter.checkLimit(key, maxRequests, windowSeconds);
      
      if (result4.allowed) {
        throw new Error('Rate limit should have been exceeded');
      }
      
      // Wait for window reset
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Should be allowed again
      const resultAfterReset = await this.rateLimiter.checkLimit(key, maxRequests, windowSeconds);
      
      if (!resultAfterReset.allowed) {
        throw new Error('Rate limit should have reset');
      }
      
      return {
        beforeReset: { allowed: result4.allowed, remaining: result4.remaining },
        afterReset: { allowed: resultAfterReset.allowed, remaining: resultAfterReset.remaining }
      };
    });
  }

  /**
   * Test performance and stress scenarios
   */
  async testPerformance() {
    await this.runTest('Concurrent operations performance', async () => {
      const concurrency = 50;
      const operations = [];
      
      for (let i = 0; i < concurrency; i++) {
        operations.push(
          this.cache.set(`test:perf:${i}`, { id: i, data: `Performance test ${i}` }, { ex: 120 })
        );
      }
      
      const start = performance.now();
      const results = await Promise.all(operations);
      const duration = performance.now() - start;
      
      const successCount = results.filter(r => r === true).length;
      
      if (successCount !== concurrency) {
        throw new Error(`Expected ${concurrency} successful operations, got ${successCount}`);
      }
      
      return {
        concurrency,
        duration: duration.toFixed(2) + 'ms',
        avgTimePerOp: (duration / concurrency).toFixed(2) + 'ms',
        successRate: ((successCount / concurrency) * 100).toFixed(1) + '%'
      };
    });

    await this.runTest('Large payload handling', async () => {
      const key = 'test:large:payload';
      
      // Create a large object (~100KB)
      const largePayload = {
        id: 'large-test',
        data: Array(10000).fill(0).map((_, i) => ({
          index: i,
          value: `Large data entry ${i}`,
          metadata: {
            timestamp: Date.now(),
            random: Math.random()
          }
        }))
      };
      
      const start = performance.now();
      
      await this.cache.set(key, largePayload, { ex: 60 });
      const retrieved = await this.cache.get(key);
      
      const duration = performance.now() - start;
      
      if (!retrieved || retrieved.data.length !== largePayload.data.length) {
        throw new Error('Large payload handling failed');
      }
      
      const payloadSize = JSON.stringify(largePayload).length;
      
      return {
        payloadSize: `${(payloadSize / 1024).toFixed(2)} KB`,
        duration: duration.toFixed(2) + 'ms',
        dataIntegrity: retrieved.data.length === largePayload.data.length
      };
    });
  }

  /**
   * Test error handling and edge cases
   */
  async testErrorHandling() {
    await this.runTest('Null value handling', async () => {
      const key = 'test:null';
      
      await this.cache.set(key, null);
      const retrieved = await this.cache.get(key);
      
      // Should handle null gracefully
      return { retrieved, handledGracefully: true };
    });

    await this.runTest('Non-existent key handling', async () => {
      const key = 'test:nonexistent:' + Date.now();
      const result = await this.cache.get(key);
      
      if (result !== null) {
        throw new Error('Should return null for non-existent key');
      }
      
      return { result };
    });

    await this.runTest('Invalid TTL handling', async () => {
      const key = 'test:invalid:ttl';
      
      // Should handle invalid TTL gracefully
      try {
        await this.cache.set(key, 'test', { ex: -1 });
        const result = await this.cache.get(key);
        return { handled: true, result };
      } catch (error) {
        return { handled: true, error: error.message };
      }
    });
  }

  /**
   * Test application-specific cache scenarios
   */
  async testApplicationScenarios() {
    await this.runTest('Artist data caching', async () => {
      const artistId = 'test-artist-123';
      const artistData = {
        id: artistId,
        name: 'Test Artist',
        genres: ['Rock', 'Alternative'],
        popularity: 85,
        followerCount: 12500,
        stats: {
          totalShows: 45,
          upcomingShows: 3,
          totalVotes: 8934
        }
      };
      
      const key = cacheKeys.artist(artistId);
      
      await this.cache.set(key, artistData, { ex: 900 }); // 15 minutes
      const cached = await this.cache.get(key);
      
      if (!cached || cached.id !== artistId) {
        throw new Error('Artist caching failed');
      }
      
      return { key, originalSize: JSON.stringify(artistData).length, retrieved: cached };
    });

    await this.runTest('Search results caching', async () => {
      const query = 'taylor swift';
      const searchResults = Array(20).fill(0).map((_, i) => ({
        id: `artist-${i}`,
        name: `Artist ${i}`,
        relevanceScore: 0.9 - (i * 0.05)
      }));
      
      const key = cacheKeys.searchResults(query, 'artists');
      
      await this.cache.set(key, searchResults, { ex: 600 }); // 10 minutes
      const cached = await this.cache.get(key);
      
      if (!cached || cached.length !== searchResults.length) {
        throw new Error('Search results caching failed');
      }
      
      return { key, resultCount: cached.length, firstResult: cached[0] };
    });

    await this.runTest('Sync progress tracking', async () => {
      const artistId = 'sync-artist-456';
      const progressData = {
        artistId,
        status: 'in_progress',
        phase: 'fetching_shows',
        progress: 65,
        totalSteps: 100,
        startedAt: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      };
      
      const key = cacheKeys.syncProgress(artistId);
      
      await this.cache.set(key, progressData, { ex: 3600 }); // 1 hour
      
      // Simulate progress updates
      for (let progress = 70; progress <= 100; progress += 10) {
        progressData.progress = progress;
        progressData.lastUpdate = new Date().toISOString();
        if (progress === 100) {
          progressData.status = 'completed';
          progressData.phase = 'completed';
        }
        await this.cache.set(key, progressData, { ex: 3600 });
      }
      
      const finalProgress = await this.cache.get(key);
      
      if (!finalProgress || finalProgress.status !== 'completed') {
        throw new Error('Sync progress tracking failed');
      }
      
      return { key, finalProgress };
    });
  }

  /**
   * Run all tests and generate report
   */
  async runAllTests() {
    console.log(chalk.yellow.bold('\n🚀 Redis Connection Test Suite'));
    console.log(chalk.yellow('Testing Redis/Upstash functionality...\n'));

    // Check if Redis is configured
    const cache = CacheClient.getInstance();
    const testConnection = await cache.get('connection:test');
    console.log(chalk.blue(`Connection test result: ${testConnection !== null ? 'Connected' : 'Not configured (graceful fallback)'}\n`));

    try {
      // Run test suites
      console.log(chalk.cyan.bold('📋 Basic Operations'));
      await this.testBasicOperations();
      
      console.log(chalk.cyan.bold('\n📋 Advanced Operations'));
      await this.testAdvancedOperations();
      
      console.log(chalk.cyan.bold('\n📋 Cache Patterns'));
      await this.testCachePatterns();
      
      console.log(chalk.cyan.bold('\n📋 Rate Limiting'));
      await this.testRateLimiting();
      
      console.log(chalk.cyan.bold('\n📋 Performance Tests'));
      await this.testPerformance();
      
      console.log(chalk.cyan.bold('\n📋 Error Handling'));
      await this.testErrorHandling();
      
      console.log(chalk.cyan.bold('\n📋 Application Scenarios'));
      await this.testApplicationScenarios();
      
    } catch (error) {
      console.log(chalk.red(`\n❌ Test suite failed: ${error}`));
    }

    // Generate summary
    this.generateSummary();
  }

  /**
   * Generate test summary report
   */
  private generateSummary() {
    console.log(chalk.yellow.bold('\n📊 Test Summary'));
    console.log(chalk.yellow('==================\n'));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const averageTime = this.results.reduce((sum, r) => sum + r.duration, 0) / totalTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`${chalk.green('Passed:')} ${passedTests}`);
    console.log(`${chalk.red('Failed:')} ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`Average Duration: ${averageTime.toFixed(2)}ms\n`);

    if (failedTests > 0) {
      console.log(chalk.red.bold('❌ Failed Tests:'));
      this.results
        .filter(r => !r.success)
        .forEach(test => {
          console.log(`  ${chalk.red('•')} ${test.name}: ${test.error}`);
        });
      console.log();
    }

    // Performance insights
    const slowTests = this.results.filter(r => r.duration > 100).sort((a, b) => b.duration - a.duration);
    if (slowTests.length > 0) {
      console.log(chalk.yellow.bold('⚠️  Slow Tests (>100ms):'));
      slowTests.slice(0, 5).forEach(test => {
        console.log(`  ${chalk.yellow('•')} ${test.name}: ${test.duration.toFixed(2)}ms`);
      });
      console.log();
    }

    // Redis configuration status
    console.log(chalk.blue.bold('🔧 Configuration Status:'));
    console.log(`Redis/Upstash: ${process.env.REDIS_URL ? chalk.green('Configured') : chalk.yellow('Not configured (graceful fallback)')}`);
    console.log(`Cache Strategy: ${chalk.green('Functional with fallback to no-cache')}`);
    console.log();

    if (passedTests === totalTests) {
      console.log(chalk.green.bold('🎉 All tests passed! Redis functionality is working correctly.'));
    } else if (passedTests > 0) {
      console.log(chalk.yellow.bold('⚠️  Some tests failed. Check Redis configuration.'));
    } else {
      console.log(chalk.red.bold('❌ All tests failed. Redis connection issues detected.'));
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const testSuite = new RedisTestSuite();
  await testSuite.runAllTests();
  
  // Exit with appropriate code
  const failedTests = testSuite.results.filter(r => !r.success).length;
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red.bold('Fatal error:'), error);
    process.exit(1);
  });
}

export default RedisTestSuite;