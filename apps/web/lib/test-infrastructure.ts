/**
 * Infrastructure Setup Verification
 * Tests that all queue, Redis, and concurrency systems are working correctly
 */

import { queueManager, QueueName, Priority } from './queues/queue-manager';
import { RedisCache, createRedisClient } from './queues/redis-config';
import { ProgressBus } from './services/progress/ProgressBus';
import { pLimit, processBatch } from './utils/concurrency';

/**
 * Comprehensive infrastructure test
 */
export async function testInfrastructure(): Promise<{
  redis: boolean;
  queues: boolean;
  progressBus: boolean;
  concurrency: boolean;
  errors: string[];
}> {
  const results = {
    redis: false,
    queues: false,
    progressBus: false,
    concurrency: false,
    errors: [] as string[],
  };

  console.log('🧪 Testing Infrastructure Setup...');

  // Test Redis connection and cache
  try {
    console.log('  📡 Testing Redis connection...');
    const cache = new RedisCache();
    const testKey = `test:${Date.now()}`;
    const testValue = { test: true, timestamp: Date.now() };
    
    await cache.set(testKey, testValue, 30); // 30 second TTL
    const retrieved = await cache.get<typeof testValue>(testKey);
    
    if (retrieved?.test === true) {
      results.redis = true;
      console.log('  ✅ Redis cache working correctly');
    } else {
      throw new Error('Redis cache retrieval failed');
    }
    
    await cache.del(testKey);
    await cache.close();
  } catch (error) {
    results.errors.push(`Redis: ${error instanceof Error ? error.message : String(error)}`);
    console.log('  ❌ Redis test failed:', error);
  }

  // Test Queue Manager
  try {
    console.log('  🔄 Testing Queue Manager...');
    const queue = queueManager.getQueue(QueueName.ARTIST_IMPORT);
    
    // Add a test job
    const testJob = await queueManager.addJob(
      QueueName.ARTIST_IMPORT,
      'test-job',
      { test: true, timestamp: Date.now() },
      { priority: Priority.CRITICAL }
    );
    
    // Check queue metrics
    const metrics = await queueManager.getQueueMetrics(QueueName.ARTIST_IMPORT);
    
    if (testJob.id && metrics.name === QueueName.ARTIST_IMPORT) {
      results.queues = true;
      console.log('  ✅ Queue Manager working correctly');
    } else {
      throw new Error('Queue job creation or metrics failed');
    }
    
    // Clean up test job
    await testJob.remove();
  } catch (error) {
    results.errors.push(`Queues: ${error instanceof Error ? error.message : String(error)}`);
    console.log('  ❌ Queue Manager test failed:', error);
  }

  // Test Progress Bus
  try {
    console.log('  📈 Testing Progress Bus...');
    const testArtistId = `test-artist-${Date.now()}`;
    let progressReceived = false;
    
    // Subscribe to progress events
    const progressListener = (event: any) => {
      progressReceived = true;
    };
    
    ProgressBus.onProgress(testArtistId, progressListener);
    
    // Report progress
    await ProgressBus.report(
      testArtistId,
      'initializing',
      25,
      'Testing progress system',
      { metadata: { test: true } }
    );
    
    // Small delay to allow event emission
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if we can retrieve status
    const status = await ProgressBus.getStatus(testArtistId);
    
    if (status && status.stage === 'initializing' && status.progress === 25) {
      results.progressBus = true;
      console.log('  ✅ Progress Bus working correctly');
    } else {
      throw new Error('Progress Bus status retrieval failed');
    }
    
    // Clean up
    ProgressBus.offProgress(testArtistId, progressListener);
  } catch (error) {
    results.errors.push(`ProgressBus: ${error instanceof Error ? error.message : String(error)}`);
    console.log('  ❌ Progress Bus test failed:', error);
  }

  // Test Concurrency Utilities
  try {
    console.log('  ⚡ Testing Concurrency Utilities...');
    
    // Test pLimit
    const limit = pLimit(2);
    const startTime = Date.now();
    
    const testTasks = Array.from({ length: 4 }, (_, i) => 
      limit(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return i;
      })
    );
    
    const results_concurrent = await Promise.all(testTasks);
    const endTime = Date.now();
    
    // Should take at least 200ms (2 batches of 100ms with concurrency 2)
    // but less than 400ms (sequential would be ~400ms)
    const duration = endTime - startTime;
    
    if (results_concurrent.length === 4 && duration >= 180 && duration < 350) {
      // Test processBatch
      const batchResults = await processBatch(
        [1, 2, 3, 4, 5],
        async (item) => item * 2,
        { concurrency: 3 }
      );
      
      if (batchResults.length === 5 && batchResults[0] === 2) {
        results.concurrency = true;
        console.log('  ✅ Concurrency utilities working correctly');
      } else {
        throw new Error('processBatch test failed');
      }
    } else {
      throw new Error(`pLimit test failed - duration: ${duration}ms, results: ${results_concurrent.length}`);
    }
  } catch (error) {
    results.errors.push(`Concurrency: ${error instanceof Error ? error.message : String(error)}`);
    console.log('  ❌ Concurrency utilities test failed:', error);
  }

  // Summary
  const allPassed = results.redis && results.queues && results.progressBus && results.concurrency;
  
  console.log('\n📊 Infrastructure Test Results:');
  console.log(`  Redis Cache: ${results.redis ? '✅' : '❌'}`);
  console.log(`  Queue Manager: ${results.queues ? '✅' : '❌'}`);
  console.log(`  Progress Bus: ${results.progressBus ? '✅' : '❌'}`);
  console.log(`  Concurrency Utils: ${results.concurrency ? '✅' : '❌'}`);
  
  if (allPassed) {
    console.log('\n🎉 All infrastructure systems are working correctly!');
  } else {
    console.log('\n⚠️  Some infrastructure components failed:');
    results.errors.forEach(error => console.log(`     - ${error}`));
  }
  
  return results;
}

/**
 * Quick health check for production monitoring
 */
export async function healthCheck(): Promise<boolean> {
  try {
    // Quick Redis test
    const cache = new RedisCache();
    await cache.set('health:check', { status: 'ok' }, 10);
    const result = await cache.get('health:check');
    await cache.del('health:check');
    await cache.close();
    
    if (!result) {
      return false;
    }
    
    // Quick queue test
    const metrics = await queueManager.getQueueMetrics(QueueName.ARTIST_IMPORT);
    if (!metrics.name) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

/**
 * Environment setup verification
 */
export function verifyEnvironment(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const required = ['REDIS_URL', 'REDIS_HOST'];
  const optional = ['REDIS_PORT', 'REDIS_USERNAME', 'REDIS_PASSWORD', 'REDIS_TLS'];
  
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Check if at least one Redis config method is available
  const hasRedisUrl = !!process.env.REDIS_URL;
  const hasRedisHost = !!process.env.REDIS_HOST;
  
  if (!hasRedisUrl && !hasRedisHost) {
    missing.push('REDIS_URL or REDIS_HOST');
  }
  
  // Check for common configuration issues
  if (hasRedisUrl && hasRedisHost) {
    warnings.push('Both REDIS_URL and REDIS_HOST are set - REDIS_URL will take precedence');
  }
  
  if (!process.env.NODE_ENV) {
    warnings.push('NODE_ENV is not set - defaulting to development mode');
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}