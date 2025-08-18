import { Queue, Worker, QueueEvents, Job, JobsOptions, RepeatOptions } from "bullmq";
import { bullMQConnection } from "./redis-config";

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
      removeOnFail: { age: 86400 },
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

// Queue manager singleton
export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<QueueName, Queue> = new Map();
  private workers: Map<QueueName, Worker> = new Map();
  private events: Map<QueueName, QueueEvents> = new Map();
  
  private constructor() {}
  
  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }
  
  // Get or create a queue
  getQueue(name: QueueName): Queue {
    if (!this.queues.has(name)) {
      const config = queueConfigs[name];
      const queue = new Queue(name, {
        connection: bullMQConnection,
        defaultJobOptions: config.defaultJobOptions || {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: { age: 3600 },
          removeOnFail: { age: 86400 },
        },
      });
      this.queues.set(name, queue);
    }
    return this.queues.get(name)!;
  }
  
  // Create a worker for a queue
  createWorker(
    name: QueueName,
    processor: (job: Job) => Promise<any>
  ): Worker {
    if (this.workers.has(name)) {
      console.warn(`Worker for queue ${name} already exists`);
      return this.workers.get(name)!;
    }
    
    const config = queueConfigs[name];
    const worker = new Worker(name, processor, {
      connection: bullMQConnection,
      concurrency: config.concurrency,
      limiter: config.rateLimit ? {
        max: config.rateLimit.max,
        duration: config.rateLimit.duration,
      } : undefined,
    });
    
    // Add error handling
    worker.on("failed", (job, err) => {
      console.error(`Job ${job?.id} in queue ${name} failed:`, err);
    });
    
    worker.on("error", (err) => {
      console.error(`Worker error in queue ${name}:`, err);
    });
    
    this.workers.set(name, worker);
    return worker;
  }
  
  // Get queue events for monitoring
  getQueueEvents(name: QueueName): QueueEvents {
    if (!this.events.has(name)) {
      const events = new QueueEvents(name, {
        connection: bullMQConnection,
      });
      this.events.set(name, events);
    }
    return this.events.get(name)!;
  }
  
  // Add a job to a queue
  async addJob<T = any>(
    queueName: QueueName,
    jobName: string,
    data: T,
    options?: JobsOptions
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    return await queue.add(jobName, data, options);
  }
  
  // Add bulk jobs
  async addBulkJobs<T = any>(
    queueName: QueueName,
    jobs: Array<{ name: string; data: T; opts?: JobsOptions }>
  ): Promise<Job<T>[]> {
    const queue = this.getQueue(queueName);
    return await queue.addBulk(jobs);
  }
  
  // Schedule a recurring job
  async scheduleRecurringJob(
    queueName: QueueName,
    jobName: string,
    data: any,
    repeatOptions: RepeatOptions,
    jobOptions?: JobsOptions
  ): Promise<Job> {
    const queue = this.getQueue(queueName);
    return await queue.add(jobName, data, {
      ...jobOptions,
      repeat: repeatOptions,
    });
  }
  
  // Get job counts
  async getJobCounts(queueName: QueueName): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.getQueue(queueName);
    const counts = await queue.getJobCounts();
    
    // Map the BullMQ job counts to our expected structure
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    };
  }
  
  // Clean old jobs
  async cleanQueue(
    queueName: QueueName,
    grace: number = 0,
    limit: number = 1000,
    status?: "completed" | "failed"
  ): Promise<string[]> {
    const queue = this.getQueue(queueName);
    if (status) {
      return await queue.clean(grace, limit, status);
    }
    const completed = await queue.clean(grace, limit, "completed");
    const failed = await queue.clean(grace, limit, "failed");
    return [...completed, ...failed];
  }
  
  // Pause a queue
  async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
  }
  
  // Resume a queue
  async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
  }
  
  // Close all connections
  async closeAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    // Close workers first
    for (const worker of this.workers.values()) {
      promises.push(worker.close());
    }
    
    // Then close events
    for (const events of this.events.values()) {
      promises.push(events.close());
    }
    
    // Finally close queues
    for (const queue of this.queues.values()) {
      promises.push(queue.close());
    }
    
    await Promise.all(promises);
    
    this.workers.clear();
    this.events.clear();
    this.queues.clear();
  }
  
  // Get queue metrics
  async getQueueMetrics(queueName: QueueName): Promise<{
    name: string;
    counts: any;
    isPaused: boolean;
    workersCount: number;
  }> {
    const queue = this.getQueue(queueName);
    const counts = await queue.getJobCounts();
    const isPaused = await queue.isPaused();
    const worker = this.workers.get(queueName);
    
    return {
      name: queueName,
      counts,
      isPaused,
      workersCount: worker ? 1 : 0,
    };
  }
  
  // Get all metrics
  async getAllMetrics(): Promise<any[]> {
    const metrics: any[] = [];
    for (const queueName of Object.values(QueueName)) {
      const metric = await this.getQueueMetrics(queueName as QueueName);
      metrics.push(metric);
    }
    return metrics;
  }
}

// Export singleton instance
export const queueManager = QueueManager.getInstance();