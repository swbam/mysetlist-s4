import { queueManager, QueueName } from "./queue-manager";
import { processArtistImport } from "./processors/artist-import.processor";
import { processSpotifySync, processSpotifyCatalog } from "./processors/spotify-sync.processor";
import { processTicketmasterSync } from "./processors/ticketmaster-sync.processor";
import { processVenueSync } from "./processors/venue-sync.processor";
import { processTrendingCalc } from "./processors/trending.processor";
import { processScheduledSync } from "./processors/scheduled-sync.processor";
import { Worker } from "bullmq";

// Worker registry
const workers: Map<QueueName, Worker> = new Map();

// Initialize all workers
export async function initializeWorkers() {
  console.log("🚀 Initializing BullMQ workers...");
  
  // Artist Import Worker
  const artistImportWorker = queueManager.createWorker(
    QueueName.ARTIST_IMPORT,
    processArtistImport
  );
  
  artistImportWorker.on("completed", (job) => {
    console.log(`✅ Artist import completed: ${job.id}`);
  });
  
  artistImportWorker.on("failed", (job, err) => {
    console.error(`❌ Artist import failed: ${job?.id}`, err.message);
  });
  
  workers.set(QueueName.ARTIST_IMPORT, artistImportWorker);
  
  // Spotify Sync Worker
  const spotifySyncWorker = queueManager.createWorker(
    QueueName.SPOTIFY_SYNC,
    processSpotifySync
  );
  
  spotifySyncWorker.on("progress", (job, progress) => {
    console.log(`📊 Spotify sync progress for ${job.id}: ${progress}%`);
  });
  
  workers.set(QueueName.SPOTIFY_SYNC, spotifySyncWorker);
  
  // Spotify Catalog Worker
  const spotifyCatalogWorker = queueManager.createWorker(
    QueueName.SPOTIFY_CATALOG,
    processSpotifyCatalog
  );
  
  workers.set(QueueName.SPOTIFY_CATALOG, spotifyCatalogWorker);
  
  // Ticketmaster Sync Worker
  const ticketmasterWorker = queueManager.createWorker(
    QueueName.TICKETMASTER_SYNC,
    processTicketmasterSync
  );
  
  workers.set(QueueName.TICKETMASTER_SYNC, ticketmasterWorker);
  
  // Venue Sync Worker
  const venueSyncWorker = queueManager.createWorker(
    QueueName.VENUE_SYNC,
    processVenueSync
  );
  
  workers.set(QueueName.VENUE_SYNC, venueSyncWorker);
  
  // Trending Calculation Worker
  const trendingWorker = queueManager.createWorker(
    QueueName.TRENDING_CALC,
    processTrendingCalc
  );
  
  workers.set(QueueName.TRENDING_CALC, trendingWorker);
  
  // Scheduled Sync Worker
  const scheduledWorker = queueManager.createWorker(
    QueueName.SCHEDULED_SYNC,
    processScheduledSync
  );
  
  workers.set(QueueName.SCHEDULED_SYNC, scheduledWorker);
  
  console.log(`✅ Initialized ${workers.size} workers`);
  
  // Set up graceful shutdown
  setupGracefulShutdown();
  
  return workers;
}

// Set up recurring jobs
export async function setupRecurringJobs() {
  console.log("⏰ Setting up recurring jobs...");
  
  // Calculate trending artists every hour
  await queueManager.scheduleRecurringJob(
    QueueName.TRENDING_CALC,
    "calculate-trending",
    { timeframe: "hourly" },
    { pattern: "0 * * * *" }, // Every hour
    { priority: 20 }
  );
  
  // Sync active artists every 6 hours
  await queueManager.scheduleRecurringJob(
    QueueName.SCHEDULED_SYNC,
    "sync-active-artists",
    { type: "active", limit: 50 },
    { pattern: "0 */6 * * *" }, // Every 6 hours
    { priority: 10 }
  );
  
  // Deep sync trending artists daily
  await queueManager.scheduleRecurringJob(
    QueueName.SCHEDULED_SYNC,
    "deep-sync-trending",
    { type: "trending", deep: true },
    { pattern: "0 3 * * *" }, // Daily at 3 AM
    { priority: 20 }
  );
  
  // Clean up old jobs weekly
  await queueManager.scheduleRecurringJob(
    QueueName.CLEANUP,
    "cleanup-old-jobs",
    { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
    { pattern: "0 0 * * 0" }, // Weekly on Sunday
    { priority: 50 }
  );
  
  console.log("✅ Recurring jobs scheduled");
}

// Graceful shutdown handler
function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
    
    try {
      // Stop all workers from accepting new jobs
      const stopPromises = Array.from(workers.values()).map(worker => 
        worker.close()
      );
      
      await Promise.all(stopPromises);
      console.log("✅ All workers stopped");
      
      // Close queue manager connections
      await queueManager.closeAll();
      console.log("✅ Queue connections closed");
      
      process.exit(0);
    } catch (error) {
      console.error("❌ Error during shutdown:", error);
      process.exit(1);
    }
  };
  
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// Worker health check
export async function checkWorkerHealth(): Promise<{
  healthy: boolean;
  workers: Array<{
    name: string;
    running: boolean;
    jobCount?: number;
  }>;
}> {
  const healthStatus: Array<{
    name: QueueName;
    running: boolean;
    jobCount?: number;
  }> = [];
  
  for (const [name, worker] of workers.entries()) {
    const isRunning = worker.isRunning();
    const isPaused = await worker.isPaused();
    
    healthStatus.push({
      name,
      running: isRunning && !isPaused,
      jobCount: worker.concurrency,
    });
  }
  
  const healthy = healthStatus.every(w => w.running);
  
  return {
    healthy,
    workers: healthStatus,
  };
}

// Get queue statistics
export async function getQueueStats() {
  const stats: Array<{
    queue: QueueName;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> = [];
  
  for (const queueName of Object.values(QueueName)) {
    const counts = await queueManager.getJobCounts(queueName as QueueName);
    stats.push({
      queue: queueName,
      ...counts,
    });
  }
  
  return stats;
}

// Manual job trigger helper
export async function triggerManualJob(
  queueName: QueueName,
  jobName: string,
  data: any,
  priority?: number
) {
  return await queueManager.addJob(
    queueName,
    jobName,
    data,
    { priority: priority || 10 }
  );
}

// Export for external use
export { workers, queueManager };