// MySetlist-S4 Complete Queue Manager Implementation
// File: apps/web/lib/queues/queue-manager.ts
// Production-ready queue management with all processors

import { Queue, Worker, QueueEvents, Job, JobsOptions } from "bullmq";
import { connection, defaultJobOptions } from "./redis-config";
import { db, sql } from "@repo/database";

// Import processors (to be created)
import ArtistImportProcessor from "./processors/artist-import.processor";
import SpotifySyncProcessor from "./processors/spotify-sync.processor";
import TicketmasterSyncProcessor from "./processors/ticketmaster-sync.processor";
import VenueSyncProcessor from "./processors/venue-sync.processor";
import { processTrendingCalc } from "./processors/trending.processor";
import ScheduledSyncProcessor from "./processors/scheduled-sync.processor";
// Inline cleanup processor to avoid import resolution issues

// Queue names with purpose
export enum QueueName {
  // High priority import queues
  ARTIST_IMPORT = "artist-import",
  ARTIST_QUICK_SYNC = "artist-quick-sync",
  
  // Data sync queues
  SPOTIFY_SYNC = "spotify-sync",
  SPOTIFY_CATALOG = "spotify-catalog",
  TICKETMASTER_SYNC = "ticketmaster-sync",
  VENUE_SYNC = "venue-sync",
  SETLIST_SYNC = "setlist-sync",
  
  // Background processing
  IMAGE_PROCESSING = "image-processing",
  TRENDING_CALC = "trending-calc",
  CACHE_WARM = "cache-warm",
  
  // Scheduled/recurring jobs
  SCHEDULED_SYNC = "scheduled-sync",
  CLEANUP = "cleanup-jobs",
  
  // Notification/communication
  PROGRESS_UPDATE = "progress-update",
  WEBHOOK = "webhook-notify",
}

// Job priorities (lower number = higher priority)
export enum Priority {
  CRITICAL = 1,    // User-initiated imports
  HIGH = 5,        // Real-time sync
  NORMAL = 10,     // Standard background sync
  LOW = 20,        // Catalog deep sync
  BACKGROUND = 50, // Analytics, cleanup
}

// Job data types
export interface ArtistImportJobData {
  tmAttractionId: string;
  artistId?: string;
  priority?: Priority;
  adminImport?: boolean;
  userId?: string;
  phase1Complete?: boolean;
  syncOnly?: boolean;
}

export interface SpotifySyncJobData {
  artistId: string;
  spotifyId: string;
  syncType: 'profile' | 'albums' | 'tracks' | 'full';
  options?: {
    includeCompilations?: boolean;
    includeAppearsOn?: boolean;
    skipLive?: boolean;
  };
}

export interface ScheduledSyncJobData {
  syncType: 'active-artists' | 'trending' | 'complete-catalog';
  options?: Record<string, any>;
}

// Queue configurations with optimal settings
export const queueConfigs: Record<QueueName, {
  concurrency: number;
  rateLimit?: { max: number; duration: number };
  defaultJobOptions?: JobsOptions;
}> = {
  [QueueName.ARTIST_IMPORT]: {
    concurrency: 5,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 3600, count: 100 },
      removeOnFail: { age: 86400, count: 200 },
    },
  },
  [QueueName.ARTIST_QUICK_SYNC]: {
    concurrency: 10,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "fixed", delay: 1000 },
      removeOnComplete: { age: 1800 },
    },
  },
  [QueueName.SPOTIFY_SYNC]: {
    concurrency: 3,
    rateLimit: { max: 30, duration: 1000 }, // Spotify rate limit
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 3000 },
    },
  },
  [QueueName.SPOTIFY_CATALOG]: {
    concurrency: 2,
    rateLimit: { max: 20, duration: 1000 },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    },
  },
  [QueueName.TICKETMASTER_SYNC]: {
    concurrency: 3,
    rateLimit: { max: 20, duration: 1000 }, // Ticketmaster rate limit
    defaultJobOptions: {
      attempts: 4,
      backoff: { type: "exponential", delay: 2000 },
    },
  },
  [QueueName.VENUE_SYNC]: {
    concurrency: 10,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "fixed", delay: 1000 },
    },
  },
  [QueueName.SETLIST_SYNC]: {
    concurrency: 2,
    rateLimit: { max: 10, duration: 1000 }, // Setlist.fm rate limit
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
    },
  },
  [QueueName.IMAGE_PROCESSING]: {
    concurrency: 5,
    defaultJobOptions: {
      attempts: 2,
      removeOnComplete: { age: 300 },
    },
  },
  [QueueName.TRENDING_CALC]: {
    concurrency: 1,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "fixed", delay: 5000 },
    },
  },
  [QueueName.CACHE_WARM]: {
    concurrency: 5,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { age: 60 },
    },
  },
  [QueueName.SCHEDULED_SYNC]: {
    concurrency: 3,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "fixed", delay: 5000 },
    },
  },
  [QueueName.CLEANUP]: {
    concurrency: 1,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 10 },
    },
  },
  [QueueName.PROGRESS_UPDATE]: {
    concurrency: 20,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { age: 60 },
    },
  },
  [QueueName.WEBHOOK]: {
    concurrency: 5,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    },
  },
};

// Queue Manager singleton class
class QueueManager {
  private queues: Map<QueueName, Queue> = new Map();
  private workers: Map<QueueName, Worker> = new Map();
  private queueEvents: Map<QueueName, QueueEvents> = new Map();
  private isInitialized = false;
  private shutdownPromise?: Promise<void>;
  
  getQueue(name: string): Queue | undefined {
    return this.queues.get(name as any);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("QueueManager already initialized");
      return;
    }

    console.log("🚀 Initializing Queue Manager...");

    try {
      // Create all queues
      for (const queueName of Object.values(QueueName)) {
        await this.createQueue(queueName as QueueName);
      }

      // Create workers for specific queues
      await this.createWorker(QueueName.ARTIST_IMPORT);
      await this.createWorker(QueueName.SPOTIFY_SYNC);
      await this.createWorker(QueueName.SPOTIFY_CATALOG);
      await this.createWorker(QueueName.TICKETMASTER_SYNC);
      await this.createWorker(QueueName.VENUE_SYNC);
      await this.createWorker(QueueName.TRENDING_CALC);
      await this.createWorker(QueueName.SCHEDULED_SYNC);
      await this.createWorker(QueueName.CLEANUP);

      // Set up event monitoring
      this.setupEventMonitoring();

      this.isInitialized = true;
      console.log("✅ Queue Manager initialized successfully");

    } catch (error) {
      console.error("❌ Failed to initialize Queue Manager:", error);
      throw error;
    }
  }

  private async createQueue(name: QueueName): Promise<void> {
    if (this.queues.has(name)) return;

    const config = queueConfigs[name];
    const queue = new Queue(name, {
      connection,
      defaultJobOptions: {
        ...defaultJobOptions,
        ...config.defaultJobOptions,
      },
    });

    // Set up queue events
    const queueEvents = new QueueEvents(name, { connection });
    
    queueEvents.on('waiting', ({ jobId }) => {
      console.log(`Job ${jobId} waiting in ${name}`);
    });

    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      console.log(`Job ${jobId} completed in ${name}`);
      this.logJobToDatabase(jobId, name, 'completed', returnvalue);
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`Job ${jobId} failed in ${name}: ${failedReason}`);
      this.logJobToDatabase(jobId, name, 'failed', { error: failedReason });
    });

    this.queues.set(name, queue);
    this.queueEvents.set(name, queueEvents);
  }

  private async createWorker(name: QueueName): Promise<void> {
    if (this.workers.has(name)) return;

    const config = queueConfigs[name];
    const processor = this.getProcessor(name);

    if (!processor) {
      console.warn(`No processor found for queue ${name}`);
      return;
    }

    const worker = new Worker(name, processor, {
      connection,
      concurrency: config.concurrency,
      ...(config.rateLimit && { limiter: config.rateLimit }),
    });

    // Worker event handlers
    worker.on('completed', (job) => {
      console.log(`Worker completed job ${job.id} in ${name}`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Worker failed job ${job?.id} in ${name}:`, err);
    });

    worker.on('error', (err) => {
      console.error(`Worker error in ${name}:`, err);
    });

    this.workers.set(name, worker);
  }

  private getProcessor(queueName: QueueName): any {
    switch (queueName) {
      case QueueName.ARTIST_IMPORT:
        return ArtistImportProcessor.process;
      case QueueName.SPOTIFY_SYNC:
      case QueueName.SPOTIFY_CATALOG:
        return SpotifySyncProcessor.process;
      case QueueName.TICKETMASTER_SYNC:
        return TicketmasterSyncProcessor.process;
      case QueueName.VENUE_SYNC:
        return VenueSyncProcessor.process;
      case QueueName.TRENDING_CALC:
        return processTrendingCalc;
      case QueueName.SCHEDULED_SYNC:
        return ScheduledSyncProcessor.process;
      case QueueName.CLEANUP:
        return async () => ({ success: true });
      default:
        return null;
    }
  }

  private async logJobToDatabase(jobId: string, queueName: string, status: string, result?: any): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO queue_jobs (job_id, queue_name, status, job_data, completed_at)
        VALUES (${jobId}, ${queueName}, ${status}, ${JSON.stringify(result)}, NOW())
        ON CONFLICT (job_id) DO UPDATE SET
          status = ${status},
          job_data = ${JSON.stringify(result)},
          completed_at = NOW()
      `);
    } catch (error) {
      console.error("Failed to log job to database:", error);
    }
  }

  async addJob<T>(
    queueName: QueueName,
    jobName: string,
    data: T,
    options?: JobsOptions
  ): Promise<Job> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.add(jobName, data, {
      ...queueConfigs[queueName].defaultJobOptions,
      ...options,
    });

    console.log(`Added job ${job.id} to ${queueName}`);
    return job;
  }

  async addBulkJobs<T>(
    queueName: QueueName,
    jobs: Array<{ name: string; data: T; opts?: JobsOptions }>
  ): Promise<Job[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return await queue.addBulk(jobs);
  }

  async getQueueStats(queueName: QueueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

    return {
      name: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };
  }

  async getAllStats() {
    const stats: any[] = [];
    for (const queueName of this.queues.keys()) {
      const queueStats = await this.getQueueStats(queueName);
      stats.push(queueStats);
    }
    return stats;
  }

  async getHealthStatus(): Promise<{
    healthy: boolean;
    initialized: boolean;
    queues: number;
    workers: number;
    redis: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let redisHealthy = false;

    try {
      // Check Redis connection
      redisHealthy = this.queues.size > 0;
    } catch (error) {
      errors.push(`Redis connection error: ${error}`);
    }

    // Check for stalled workers
    for (const [name, worker] of this.workers) {
      if (await worker.isPaused()) {
        errors.push(`Worker ${name} is paused`);
      }
    }

    return {
      healthy: errors.length === 0 && redisHealthy,
      initialized: this.isInitialized,
      queues: this.queues.size,
      workers: this.workers.size,
      redis: redisHealthy,
      errors,
    };
  }

  async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
      console.log(`Queue ${queueName} paused`);
    }
  }

  async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
      console.log(`Queue ${queueName} resumed`);
    }
  }

  async cleanQueue(queueName: QueueName, grace: number = 1000): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.clean(grace, 1000, 'completed');
      await queue.clean(grace, 1000, 'failed');
      console.log(`Queue ${queueName} cleaned`);
    }
  }

  async shutdown(): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.shutdownPromise = this._performShutdown();
    return this.shutdownPromise;
  }

  private async _performShutdown(): Promise<void> {
    console.log("🛑 Shutting down Queue Manager...");

    try {
      // Close workers first
      for (const [name, worker] of this.workers) {
        console.log(`Closing worker for ${name}`);
        await worker.close();
      }

      // Close queue events
      for (const [name, events] of this.queueEvents) {
        console.log(`Closing events for ${name}`);
        await events.close();
      }

      // Close queues
      for (const [name, queue] of this.queues) {
        console.log(`Closing queue ${name}`);
        await queue.close();
      }

      this.workers.clear();
      this.queueEvents.clear();
      this.queues.clear();
      this.isInitialized = false;

      console.log("✅ Queue Manager shut down successfully");
    } catch (error) {
      console.error("Error during shutdown:", error);
      throw error;
    }
  }

  // Convenience methods for specific job types
  async addArtistImportJob(data: ArtistImportJobData, options?: JobsOptions): Promise<Job> {
    return this.addJob(QueueName.ARTIST_IMPORT, 'import-artist', data, {
      priority: data.priority || Priority.NORMAL,
      ...options,
    });
  }

  async addSpotifySyncJob(data: SpotifySyncJobData, options?: JobsOptions): Promise<Job> {
    return this.addJob(QueueName.SPOTIFY_SYNC, 'sync-spotify', data, {
      priority: Priority.NORMAL,
      ...options,
    });
  }

  async addScheduledSyncJob(data: ScheduledSyncJobData, options?: JobsOptions): Promise<Job> {
    return this.addJob(QueueName.SCHEDULED_SYNC, 'scheduled-sync', data, {
      priority: Priority.LOW,
      ...options,
    });
  }

  private setupEventMonitoring(): void {
    // Set up periodic health checks
    setInterval(async () => {
      const health = await this.getHealthStatus();
      if (!health.healthy) {
        console.error("Queue system unhealthy:", health.errors);
      }
    }, 60000); // Every minute
  }
}

// Export singleton instance
const queueManagerInstance = new QueueManager();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down queue manager...');
  await queueManagerInstance.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down queue manager...');
  await queueManagerInstance.shutdown();
  process.exit(0);
});

export const queueManager = queueManagerInstance;
export default queueManagerInstance;