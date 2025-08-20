import { processArtistImport } from "./processors/artist-import.processor";
import { processCacheWarm } from "./processors/cache-warm.processor";
import { processCleanup } from "./processors/cleanup.processor";
import { processImageProcessing } from "./processors/image-processing.processor";
import { processProgressUpdate } from "./processors/progress-update.processor";
import { processScheduledSync } from "./processors/scheduled-sync.processor";
import { processSetlistSync } from "./processors/setlist-sync.processor";
import {
  processSpotifyCatalog,
  processSpotifySync,
} from "./processors/spotify-sync.processor";
import { processTicketmasterSync } from "./processors/ticketmaster-sync.processor";
import { processTrendingCalc } from "./processors/trending.processor";
import { processVenueSync } from "./processors/venue-sync.processor";
import { processWebhook } from "./processors/webhook.processor";
import { QueueName, queueManager } from "./queue-manager";
// Worker registry (track which queues have processors)
const workers: Map<QueueName, boolean> = new Map();

// Initialize all workers
export async function initializeWorkers() {
  console.log("🚀 Initializing SimpleQueue workers...");

  // Artist Import Worker
  queueManager.createWorker(QueueName.ARTIST_IMPORT, processArtistImport);

  workers.set(QueueName.ARTIST_IMPORT, true);

  // Artist Quick Sync Worker
  queueManager.createWorker(QueueName.ARTIST_QUICK_SYNC, processArtistImport);
  workers.set(QueueName.ARTIST_QUICK_SYNC, true);

  // Spotify Sync Worker
  queueManager.createWorker(QueueName.SPOTIFY_SYNC, processSpotifySync);
  workers.set(QueueName.SPOTIFY_SYNC, true);

  // Spotify Catalog Worker
  queueManager.createWorker(QueueName.SPOTIFY_CATALOG, processSpotifyCatalog);
  workers.set(QueueName.SPOTIFY_CATALOG, true);

  // Ticketmaster Sync Worker
  queueManager.createWorker(
    QueueName.TICKETMASTER_SYNC,
    processTicketmasterSync,
  );
  workers.set(QueueName.TICKETMASTER_SYNC, true);

  // Venue Sync Worker
  queueManager.createWorker(QueueName.VENUE_SYNC, processVenueSync);
  workers.set(QueueName.VENUE_SYNC, true);

  // Trending Calculation Worker
  queueManager.createWorker(QueueName.TRENDING_CALC, processTrendingCalc);
  workers.set(QueueName.TRENDING_CALC, true);

  // Scheduled Sync Worker
  queueManager.createWorker(QueueName.SCHEDULED_SYNC, processScheduledSync);
  workers.set(QueueName.SCHEDULED_SYNC, true);

  // Setlist Sync Worker
  queueManager.createWorker(QueueName.SETLIST_SYNC, processSetlistSync);
  workers.set(QueueName.SETLIST_SYNC, true);

  // Image Processing Worker
  queueManager.createWorker(QueueName.IMAGE_PROCESSING, processImageProcessing);
  workers.set(QueueName.IMAGE_PROCESSING, true);

  // Progress Update Worker
  queueManager.createWorker(QueueName.PROGRESS_UPDATE, processProgressUpdate);
  workers.set(QueueName.PROGRESS_UPDATE, true);

  // Webhook Worker
  queueManager.createWorker(QueueName.WEBHOOK, processWebhook);
  workers.set(QueueName.WEBHOOK, true);

  // Cache Warm Worker
  queueManager.createWorker(QueueName.CACHE_WARM, processCacheWarm);
  workers.set(QueueName.CACHE_WARM, true);

  // Cleanup Worker
  queueManager.createWorker(QueueName.CLEANUP, processCleanup);
  workers.set(QueueName.CLEANUP, true);

  console.log(`✅ Initialized ${workers.size} workers`);

  // Set up graceful shutdown
  setupGracefulShutdown();

  return workers;
}

// Set up recurring jobs (simplified for SimpleQueue)
export async function setupRecurringJobs() {
  console.log("⏰ Setting up recurring jobs...");

  // For SimpleQueue, we'll handle recurring jobs through cron or external scheduling
  // For now, just add some initial jobs to test the system

  await queueManager.addJob(QueueName.TRENDING_CALC, "calculate-trending", {
    timeframe: "hourly",
  });

  console.log("✅ Initial jobs scheduled");
}

// Graceful shutdown handler (simplified for SimpleQueue)
function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);

    try {
      // SimpleQueue workers stop automatically when process exits
      console.log("✅ All workers will stop with process");

      process.exit(0);
    } catch (error) {
      console.error("❌ Error during shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// Worker health check (simplified for SimpleQueue)
export async function checkWorkerHealth(): Promise<{
  healthy: boolean;
  workers: Array<{
    name: string;
    running: boolean;
    jobCount?: number;
  }>;
}> {
  const healthStatus: {
    name: QueueName;
    running: boolean;
    jobCount?: number;
  }[] = [];

  for (const [name, isRunning] of workers.entries()) {
    healthStatus.push({
      name,
      running: isRunning,
      jobCount: 0, // SimpleQueue doesn't track concurrency
    });
  }

  const healthy = healthStatus.every((w) => w.running);

  return {
    healthy,
    workers: healthStatus,
  };
}

// Get queue statistics
export async function getQueueStats() {
  const stats: any[] = [];

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
  priority?: number,
) {
  return await queueManager.addJob(queueName, jobName, data, {
    priority: priority || 10,
  });
}

// Export for external use
export { workers, queueManager };
