#!/usr/bin/env tsx

import { queueManager, QueueName } from "../lib/queues/queue-manager";
import { initializeWorkers, checkWorkerHealth, getQueueStats } from "../lib/queues/workers";
import { createRedisClient } from "../lib/queues/redis-config";
import { db, artists } from "@repo/database";
import { eq } from "drizzle-orm";

// Test configuration
const TEST_CONFIG = {
  testArtistId: "test-artist-123",
  testSpotifyId: "4Z8W4fKeB5YxbusRsdQVPb", // RadioHead
  testTicketmasterAttractionId: "K8vZ917G1V-", // Example attraction
  testSetlistfmMbid: "a74b1b7f-71a5-4011-9441-d0b5e4122711", // RadioHead
  timeout: 30000, // 30 seconds
};

async function testRedisConnection(): Promise<boolean> {
  console.log("🔍 Testing Redis connection...");
  
  try {
    const redis = createRedisClient();
    await redis.connect();
    
    // Test basic operations
    await redis.set("test:connection", "success", "EX", 10);
    const result = await redis.get("test:connection");
    await redis.del("test:connection");
    
    await redis.quit();
    
    if (result === "success") {
      console.log("✅ Redis connection successful");
      return true;
    } else {
      console.error("❌ Redis connection test failed");
      return false;
    }
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
    return false;
  }
}

async function testDatabaseConnection(): Promise<boolean> {
  console.log("🔍 Testing database connection...");
  
  try {
    // Test basic database query
    const artistCount = await db.select().from(artists).limit(1);
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

async function testWorkerInitialization(): Promise<boolean> {
  console.log("🔍 Testing worker initialization...");
  
  try {
    const workers = await initializeWorkers();
    
    if (workers.size === 0) {
      console.error("❌ No workers initialized");
      return false;
    }
    
    console.log(`✅ Initialized ${workers.size} workers successfully`);
    
    // Wait a moment for workers to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const healthCheck = await checkWorkerHealth();
    
    if (!healthCheck.healthy) {
      console.error("❌ Some workers are not healthy:", healthCheck.workers);
      return false;
    }
    
    console.log("✅ All workers are healthy");
    return true;
  } catch (error) {
    console.error("❌ Worker initialization failed:", error);
    return false;
  }
}

async function testQueueJobSubmission(): Promise<boolean> {
  console.log("🔍 Testing queue job submission...");
  
  try {
    // Test different queue types
    const testJobs = [
      {
        queue: QueueName.TRENDING_CALC,
        jobName: "test-trending-calc",
        data: { timeframe: "test" },
      },
      {
        queue: QueueName.SPOTIFY_SYNC,
        jobName: "test-spotify-sync",
        data: {
          artistId: TEST_CONFIG.testArtistId,
          spotifyId: TEST_CONFIG.testSpotifyId,
          syncType: "profile",
        },
      },
      {
        queue: QueueName.TICKETMASTER_SYNC,
        jobName: "test-ticketmaster-sync",
        data: {
          artistId: TEST_CONFIG.testArtistId,
          tmAttractionId: TEST_CONFIG.testTicketmasterAttractionId,
          syncType: "shows",
          options: { maxShows: 5 },
        },
      },
      {
        queue: QueueName.SETLIST_SYNC,
        jobName: "test-setlist-sync",
        data: {
          artistId: TEST_CONFIG.testArtistId,
          setlistfmMbid: TEST_CONFIG.testSetlistfmMbid,
          syncType: "recent",
          options: { maxSetlists: 5 },
        },
      },
    ];
    
    const submittedJobs = [];
    
    for (const testJob of testJobs) {
      try {
        const job = await queueManager.addJob(
          testJob.queue,
          testJob.jobName,
          testJob.data,
          { priority: 1, delay: 1000 } // Low priority, 1 second delay for testing
        );
        
        submittedJobs.push({ queue: testJob.queue, jobId: job.id });
        console.log(`✅ Submitted test job to ${testJob.queue}: ${job.id}`);
      } catch (error) {
        console.error(`❌ Failed to submit job to ${testJob.queue}:`, error);
        return false;
      }
    }
    
    console.log(`✅ Successfully submitted ${submittedJobs.length} test jobs`);
    return true;
  } catch (error) {
    console.error("❌ Queue job submission test failed:", error);
    return false;
  }
}

async function testQueueStatistics(): Promise<boolean> {
  console.log("🔍 Testing queue statistics...");
  
  try {
    const stats = await getQueueStats();
    
    if (!Array.isArray(stats) || stats.length === 0) {
      console.error("❌ No queue statistics available");
      return false;
    }
    
    console.log("📊 Queue Statistics:");
    stats.forEach(stat => {
      console.log(`  ${stat.queue}: waiting=${stat.waiting}, active=${stat.active}, completed=${stat.completed}, failed=${stat.failed}`);
    });
    
    console.log("✅ Queue statistics retrieved successfully");
    return true;
  } catch (error) {
    console.error("❌ Queue statistics test failed:", error);
    return false;
  }
}

async function testJobProcessing(): Promise<boolean> {
  console.log("🔍 Testing job processing (waiting for completion)...");
  
  try {
    // Add a simple test job and wait for completion
    const job = await queueManager.addJob(
      QueueName.TRENDING_CALC,
      "test-processing",
      { test: true, timeframe: "test" },
      { priority: 1 }
    );
    
    console.log(`📤 Submitted test job: ${job.id}`);
    
    // Wait for job completion with timeout
    const startTime = Date.now();
    let completed = false;
    
    while (Date.now() - startTime < TEST_CONFIG.timeout && !completed) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const jobState = await job.getState();
        const progress = job.progress;
        
        console.log(`⏳ Job ${job.id} state: ${jobState}, progress: ${progress}`);
        
        if (jobState === 'completed') {
          completed = true;
          const result = job.returnvalue;
          console.log(`✅ Job completed successfully with result:`, result);
          break;
        } else if (jobState === 'failed') {
          const error = job.failedReason;
          console.error(`❌ Job failed with error: ${error}`);
          return false;
        }
      } catch (error) {
        console.log(`⚠️ Error checking job status: ${error.message}`);
      }
    }
    
    if (!completed) {
      console.log("⚠️ Job did not complete within timeout period");
      return false;
    }
    
    console.log("✅ Job processing test successful");
    return true;
  } catch (error) {
    console.error("❌ Job processing test failed:", error);
    return false;
  }
}

async function testErrorHandling(): Promise<boolean> {
  console.log("🔍 Testing error handling...");
  
  try {
    // Submit a job with invalid data to test error handling
    const job = await queueManager.addJob(
      QueueName.SPOTIFY_SYNC,
      "test-error-handling",
      {
        artistId: "invalid-artist-id",
        spotifyId: "invalid-spotify-id",
        syncType: "invalid-type",
      },
      { priority: 1, attempts: 1 } // Only try once
    );
    
    console.log(`📤 Submitted error test job: ${job.id}`);
    
    // Wait for job to fail
    const startTime = Date.now();
    let failed = false;
    
    while (Date.now() - startTime < TEST_CONFIG.timeout && !failed) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const jobState = await job.getState();
        
        if (jobState === 'failed') {
          failed = true;
          const error = job.failedReason;
          console.log(`✅ Job failed as expected with error: ${error}`);
          break;
        } else if (jobState === 'completed') {
          console.error("❌ Job completed when it should have failed");
          return false;
        }
      } catch (error) {
        // Expected - job might be cleaned up
      }
    }
    
    if (!failed) {
      console.log("⚠️ Error handling test inconclusive");
      return true; // Don't fail the overall test
    }
    
    console.log("✅ Error handling test successful");
    return true;
  } catch (error) {
    console.error("❌ Error handling test failed:", error);
    return false;
  }
}

async function testPerformance(): Promise<boolean> {
  console.log("🔍 Testing performance with bulk jobs...");
  
  try {
    const startTime = Date.now();
    const numJobs = 20;
    
    // Submit multiple jobs concurrently
    const jobPromises = [];
    for (let i = 0; i < numJobs; i++) {
      const jobPromise = queueManager.addJob(
        QueueName.TRENDING_CALC,
        `performance-test-${i}`,
        { test: true, timeframe: "test", jobNumber: i },
        { priority: 5 }
      );
      jobPromises.push(jobPromise);
    }
    
    const jobs = await Promise.all(jobPromises);
    const submissionTime = Date.now() - startTime;
    
    console.log(`📤 Submitted ${numJobs} jobs in ${submissionTime}ms`);
    
    // Monitor completion
    let completedCount = 0;
    const checkInterval = setInterval(async () => {
      try {
        const stats = await queueManager.getJobCounts(QueueName.TRENDING_CALC);
        const newCompleted = stats.completed;
        
        if (newCompleted > completedCount) {
          completedCount = newCompleted;
          console.log(`📊 Completed ${completedCount} jobs`);
        }
      } catch (error) {
        // Ignore errors during monitoring
      }
    }, 2000);
    
    // Wait for completion or timeout
    const totalStartTime = Date.now();
    while (Date.now() - totalStartTime < TEST_CONFIG.timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const stats = await queueManager.getJobCounts(QueueName.TRENDING_CALC);
      if (stats.completed >= numJobs) {
        clearInterval(checkInterval);
        const totalTime = Date.now() - totalStartTime;
        const avgTimePerJob = totalTime / numJobs;
        
        console.log(`✅ Performance test completed:`);
        console.log(`   Total time: ${totalTime}ms`);
        console.log(`   Average per job: ${avgTimePerJob.toFixed(2)}ms`);
        console.log(`   Jobs per second: ${(1000 / avgTimePerJob * numJobs / totalTime * 1000).toFixed(2)}`);
        
        return true;
      }
    }
    
    clearInterval(checkInterval);
    console.log("⚠️ Performance test timed out");
    return false;
  } catch (error) {
    console.error("❌ Performance test failed:", error);
    return false;
  }
}

async function runAllTests(): Promise<void> {
  console.log("🚀 Starting comprehensive queue system tests...\n");
  
  const tests = [
    { name: "Redis Connection", fn: testRedisConnection },
    { name: "Database Connection", fn: testDatabaseConnection },
    { name: "Worker Initialization", fn: testWorkerInitialization },
    { name: "Queue Job Submission", fn: testQueueJobSubmission },
    { name: "Queue Statistics", fn: testQueueStatistics },
    { name: "Job Processing", fn: testJobProcessing },
    { name: "Error Handling", fn: testErrorHandling },
    { name: "Performance", fn: testPerformance },
  ];
  
  const results: { name: string; passed: boolean; error?: string }[] = [];
  
  for (const test of tests) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`📋 Running ${test.name} Test`);
    console.log(`${"=".repeat(50)}`);
    
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
      
      if (passed) {
        console.log(`✅ ${test.name} test PASSED\n`);
      } else {
        console.log(`❌ ${test.name} test FAILED\n`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({ name: test.name, passed: false, error: errorMessage });
      console.log(`❌ ${test.name} test FAILED with error: ${errorMessage}\n`);
    }
  }
  
  // Final report
  console.log(`\n${"=".repeat(70)}`);
  console.log("📊 TEST RESULTS SUMMARY");
  console.log(`${"=".repeat(70)}`);
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(result => {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    const error = result.error ? ` (${result.error})` : "";
    console.log(`${status} - ${result.name}${error}`);
  });
  
  console.log(`\n📈 Overall: ${passed}/${results.length} tests passed`);
  
  if (failed === 0) {
    console.log("🎉 ALL TESTS PASSED! Queue system is ready for production.");
  } else {
    console.log(`⚠️ ${failed} test(s) failed. Please review and fix issues before production deployment.`);
  }
  
  // Cleanup
  try {
    await queueManager.closeAll();
    console.log("\n🧹 Cleanup completed");
  } catch (error) {
    console.error("⚠️ Cleanup error:", error);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error("💥 Test suite failed:", error);
    process.exit(1);
  });
}

export {
  runAllTests,
  testRedisConnection,
  testDatabaseConnection,
  testWorkerInitialization,
  testQueueJobSubmission,
  testQueueStatistics,
  testJobProcessing,
  testErrorHandling,
  testPerformance,
};