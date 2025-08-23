// MySetlist-S4 Complete Queue Manager Implementation
// File: apps/web/lib/queues/queue-manager.ts
// REPLACE existing incomplete implementation

import { Queue, Worker, QueueEvents, Job, JobsOptions, RepeatOptions } from "bullmq";
import { getBullMQConnection } from "./redis-config";
import { db, queueJobs, sql } from "@repo/database";

// Import processors
import { ArtistImportProcessor } from "./processors/artist-import.processor";
import { SpotifySyncProcessor } from "./processors/spotify-sync.processor";
import { TicketmasterSyncProcessor } from "./processors/ticketmaster-sync.processor";
import { ScheduledSyncProcessor } from "./processors/scheduled-sync.processor";
import { TrendingProcessor } from "./processors/trending.processor";

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

export enum Priority {
  CRITICAL = 1,    // User-initiated imports
  HIGH = 5,        // Real-time sync
  NORMAL = 10,     // Standard background sync
  LOW = 20,        // Catalog deep sync
  BACKGROUND = 50, // Analytics, cleanup
}

// Job type definitions
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
const queueConfigs: Record<QueueName, {
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
      removeOnFail: { age: 86400, count: 50 },
      priority: Priority.CRITICAL,
    },
  },
  [QueueName.ARTIST_QUICK_SYNC]: {
    concurrency: 10,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "fixed", delay: 1000 },
      removeOnComplete: { age: 1800, count: 50 },
      removeOnFail: { age: 3600, count: 25 },
      priority: Priority.HIGH,
    },
  },
  [QueueName.SPOTIFY_SYNC]: {
    concurrency: 3,
    rateLimit: { max: 30, duration: 1000 }, // Spotify rate limit
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: { age: 3600, count: 25 },
      removeOnFail: { age: 7200, count: 15 },
      priority: Priority.NORMAL,
    },
  },
  [QueueName.SPOTIFY_CATALOG]: {
    concurrency: 2,
    rateLimit: { max: 20, duration: 1000 },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 7200, count: 15 },
      removeOnFail: { age: 14400, count: 10 },
      priority: Priority.LOW,
    },
  },
  [QueueName.TICKETMASTER_SYNC]: {
    concurrency: 3,
    rateLimit: { max: 200, duration: 1000 }, // Ticketmaster generous limits
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "fixed", delay: 2000 },
      removeOnComplete: { age: 3600, count: 25 },
      removeOnFail: { age: 7200, count: 15 },
      priority: Priority.NORMAL,
    },
  },
  [QueueName.VENUE_SYNC]: {
    concurrency: 2,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 7200, count: 15 },
      removeOnFail: { age: 14400, count: 10 },
      priority: Priority.LOW,
    },
  },
  [QueueName.SETLIST_SYNC]: {
    concurrency: 2,
    rateLimit: { max: 60, duration: 60000 }, // Setlist.fm: 1 request per second
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 7200, count: 15 },
      removeOnFail: { age: 14400, count: 10 },
      priority: Priority.LOW,
    },
  },
  [QueueName.TRENDING_CALC]: {
    concurrency: 2,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "fixed", delay: 1000 },
      removeOnComplete: { age: 3600, count: 10 },
      removeOnFail: { age: 7200, count: 5 },
      priority: Priority.BACKGROUND,
    },
  },
  [QueueName.SCHEDULED_SYNC]: {
    concurrency: 1, // Sequential execution for scheduled jobs
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 10000 },
      removeOnComplete: { age: 14400, count: 10 },
      removeOnFail: { age: 86400, count: 5 },
      priority: Priority.BACKGROUND,
    },
  },
  [QueueName.CLEANUP]: {
    concurrency: 1,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "fixed", delay: 5000 },
      removeOnComplete: { age: 86400, count: 5 },
      removeOnFail: { age: 172800, count: 3 },
      priority: Priority.BACKGROUND,
    },
  },
  [QueueName.CACHE_WARM]: {
    concurrency: 3,
    defaultJobOptions: {
      attempts: 1, // Don't retry cache warming
      removeOnComplete: { age: 1800, count: 10 },
      removeOnFail: { age: 3600, count: 5 },
      priority: Priority.BACKGROUND,
    },
  },
  [QueueName.IMAGE_PROCESSING]: {
    concurrency: 2,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "fixed", delay: 2000 },
      removeOnComplete: { age: 3600, count: 20 },
      removeOnFail: { age: 7200, count: 10 },
      priority: Priority.LOW,
    },
  },
  [QueueName.PROGRESS_UPDATE]: {
    concurrency: 5,
    defaultJobOptions: {
      attempts: 1, // Don't retry progress updates
      removeOnComplete: { age: 600, count: 50 },
      removeOnFail: { age: 1200, count: 25 },
      priority: Priority.HIGH,
    },
  },
  [QueueName.WEBHOOK]: {
    concurrency: 3,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 3600, count: 25 },
      removeOnFail: { age: 7200, count: 15 },
      priority: Priority.NORMAL,
    },
  },
};

class QueueManager {
  private queues: Map<QueueName, Queue> = new Map();
  private workers: Map<QueueName, Worker> = new Map();
  private queueEvents: Map<QueueName, QueueEvents> = new Map();
  private isInitialized = false;
  private shutdownPromise?: Promise<void>;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🔄 Initializing Queue Manager...');
      
      const connection = getBullMQConnection();
      
      // Test connection first
      const testRedis = new (await import('ioredis')).default(connection);
      await testRedis.ping();
      testRedis.disconnect();
      
      // Initialize core queues first
      const coreQueues = [
        QueueName.ARTIST_IMPORT,
        QueueName.SPOTIFY_SYNC,
        QueueName.TICKETMASTER_SYNC,
        QueueName.SCHEDULED_SYNC,
        QueueName.TRENDING_CALC,
      ];

      // Create core queues and workers
      for (const queueName of coreQueues) {
        await this.createQueue(queueName);
        await this.createWorker(queueName);
      }

      // Initialize remaining queues
      const remainingQueues = Object.values(QueueName).filter(q => !coreQueues.includes(q));
      for (const queueName of remainingQueues) {
        await this.createQueue(queueName);
        await this.createWorker(queueName);
      }

      this.isInitialized = true;
      console.log('✅ Queue Manager initialized successfully');
    } catch (error) {
      console.error('❌ Queue Manager initialization failed:', error);
      throw error;
    }
  }

  private async createQueue(name: QueueName): Promise<void> {
    const config = queueConfigs[name];
    const queue = new Queue(name, {
      connection: getBullMQConnection(),
      ...config.defaultJobOptions && { defaultJobOptions: config.defaultJobOptions },
    });

    // Set up queue events
    const queueEvents = new QueueEvents(name, {
      connection: getBullMQConnection(),
    });

    queueEvents.on("completed", async ({ jobId, returnvalue }) => {
      console.log(`✅ Job ${jobId} completed in ${name}:`, returnvalue);
      await this.logJobToDatabase(jobId, name, 'completed', returnvalue);
    });

    queueEvents.on("failed", async ({ jobId, failedReason }) => {
      console.error(`❌ Job ${jobId} failed in ${name}:`, failedReason);
      await this.logJobToDatabase(jobId, name, 'failed', { error: failedReason });
    });

    queueEvents.on("progress", ({ jobId, data }) => {
      console.log(`📊 Job ${jobId} progress in ${name}:`, data);
    });

    this.queues.set(name, queue);
    this.queueEvents.set(name, queueEvents);
  }

  private async createWorker(name: QueueName): Promise<void> {
    const config = queueConfigs[name];
    const processor = this.getProcessor(name);

    if (!processor) {
      console.warn(`⚠️ No processor found for queue: ${name}`);
      return;
    }

    const worker = new Worker(name, processor, {
      connection: getBullMQConnection(),
      concurrency: config.concurrency,
      limiter: config.rateLimit,
      // Add job staleness detection
      stalledInterval: 30000, // 30 seconds
      maxStalledCount: 3,
    });

    worker.on("completed", (job) => {
      console.log(`Worker completed job ${job.id} in ${name}`);
    });

    worker.on("failed", (job, err) => {
      console.error(`Worker failed job ${job?.id} in ${name}:`, err.message);
    });

    worker.on("error", (err) => {
      console.error(`Worker error in ${name}:`, err);
    });

    // Graceful shutdown handling
    worker.on("stalled", (jobId) => {
      console.warn(`⚠️ Job ${jobId} stalled in ${name}`);
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
      case QueueName.SCHEDULED_SYNC:
        return ScheduledSyncProcessor.process;
      case QueueName.TRENDING_CALC:
        return TrendingProcessor.process;
      // Add more processors as needed
      default:
        return null;
    }
  }

  private async logJobToDatabase(jobId: string, queueName: string, status: string, result?: any): Promise<void> {
    try {
      await db
        .update(queueJobs)
        .set({
          status,
          ...(status === 'completed' && { completedAt: new Date() }),
          ...(result && { 
            result: typeof result === 'object' ? JSON.stringify(result) : result 
          }),
        })
        .where(sql`job_id = ${jobId}`);
    } catch (error) {
      console.error('Failed to log job to database:', error);
    }
  }

  async addJob<T>(
    queueName: QueueName,
    jobName: string,
    data: T,
    options?: JobsOptions
  ): Promise<Job> {
    await this.initialize();
    
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    // Generate unique job ID
    const jobId = `${queueName}_${jobName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log job to database
    try {
      await db.insert(queueJobs).values({
        queueName,
        jobId,
        jobData: typeof data === 'object' ? JSON.stringify(data) : data as any,
        status: 'pending',
      });
    } catch (error) {
      console.error('Failed to log job to database:', error);
    }

    const job = await queue.add(jobName, data, {
      jobId,
      ...options,
    });

    console.log(`📋 Job ${job.id} added to ${queueName}: ${jobName}`);
    return job;
  }

  async getQueueStats(queueName: QueueName) {
    await this.initialize();
    
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),  
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      name: queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total: waiting.length + active.length + completed.length + failed.length + delayed.length,
    };
  }

  async getAllStats() {
    await this.initialize();
    
    const stats = await Promise.all(
      Array.from(this.queues.keys()).map(queueName => this.getQueueStats(queueName))
    );

    return stats.filter(Boolean);
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

    // Check initialization
    if (!this.isInitialized) {
      errors.push('Queue manager not initialized');
    }

    // Test Redis connection
    let redisHealthy = false;
    try {
      const testRedis = new (await import('ioredis')).default(getBullMQConnection());
      await testRedis.ping();
      testRedis.disconnect();
      redisHealthy = true;
    } catch (error) {
      errors.push(`Redis connection failed: ${error}`);
    }

    // Check worker health
    for (const [name, worker] of this.workers) {
      if (worker.isRunning()) {
        // Worker is healthy
      } else {
        errors.push(`Worker ${name} not running`);
      }
    }

    return {
      healthy: errors.length === 0,
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
      console.log(`⏸️ Queue ${queueName} paused`);
    }
  }

  async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
      console.log(`▶️ Queue ${queueName} resumed`);
    }
  }

  async cleanQueue(queueName: QueueName, grace: number = 1000): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.clean(grace, 'completed');
      await queue.clean(grace, 'failed');
      console.log(`🧹 Queue ${queueName} cleaned`);
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
    console.log('🔄 Shutting down Queue Manager...');
    
    // Close workers first (gracefully finish current jobs)
    const workerPromises = Array.from(this.workers.values()).map(worker => 
      worker.close()
    );
    
    // Close queues
    const queuePromises = Array.from(this.queues.values()).map(queue => 
      queue.close()
    );
    
    // Close queue events
    const eventPromises = Array.from(this.queueEvents.values()).map(events => 
      events.close()
    );

    await Promise.all([...workerPromises, ...queuePromises, ...eventPromises]);

    this.workers.clear();
    this.queues.clear();
    this.queueEvents.clear();
    this.isInitialized = false;

    console.log('✅ Queue Manager shut down successfully');
  }

  // Convenience method for common job types
  async addArtistImportJob(data: ArtistImportJobData, options?: JobsOptions): Promise<Job> {
    return this.addJob(QueueName.ARTIST_IMPORT, 'import-artist', data, {
      priority: data.priority || Priority.CRITICAL,
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
      priority: Priority.BACKGROUND,
      ...options,
    });
  }
}

// Export singleton instance
export const queueManager = new QueueManager();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await queueManager.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');  
  await queueManager.shutdown();
  process.exit(0);
});

export { QueueName, Priority };
export type { ArtistImportJobData, SpotifySyncJobData, ScheduledSyncJobData };