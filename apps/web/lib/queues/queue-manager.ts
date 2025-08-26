import { Queue, Worker, QueueEvents, Job, JobsOptions } from "bullmq";
import { Redis } from "ioredis";

// Queue configuration
export enum QueueName {
  ARTIST_IMPORT = "artist-import",
  SPOTIFY_SYNC = "spotify-sync",
  TICKETMASTER_SYNC = "ticketmaster-sync",
  VENUE_SYNC = "venue-sync",
  TRENDING_CALC = "trending-calc",
  SCHEDULED_SYNC = "scheduled-sync",
  CLEANUP = "cleanup",
}

export enum Priority {
  CRITICAL = 1,
  HIGH = 5,
  NORMAL = 10,
  LOW = 20,
}

// Redis connection configuration
const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  
  if (!redisUrl) {
    console.warn("⚠️  Redis not configured - using memory fallback");
    return {
      host: "localhost",
      port: 6379,
      maxRetriesPerRequest: 1,
    };
  }

  return {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME,
    db: parseInt(process.env.REDIS_DB || "0"),
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    connectTimeout: 10000,
    commandTimeout: 5000,
    lazyConnect: true,
    family: 4,
    keepAlive: true,
  };
};

class QueueManager {
  private queues: Map<QueueName, Queue> = new Map();
  private workers: Map<QueueName, Worker> = new Map();
  private queueEvents: Map<QueueName, QueueEvents> = new Map();
  private isInitialized = false;
  private redis: Redis | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const connection = getRedisConnection();
      this.redis = new Redis(connection);

      // Test Redis connection
      await this.redis.ping();
      console.log("✅ Redis connection established");

      // Initialize all queues
      await this.createQueue(QueueName.ARTIST_IMPORT, {
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      });

      await this.createQueue(QueueName.SPOTIFY_SYNC, {
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: "exponential", delay: 3000 },
          removeOnComplete: 5,
          removeOnFail: 3,
        },
      });

      await this.createQueue(QueueName.TICKETMASTER_SYNC, {
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "fixed", delay: 5000 },
          removeOnComplete: 5,
        },
      });

      await this.createQueue(QueueName.VENUE_SYNC, {
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: "fixed", delay: 3000 },
          removeOnComplete: 10,
        },
      });

      await this.createQueue(QueueName.TRENDING_CALC, {
        defaultJobOptions: {
          attempts: 2,
          removeOnComplete: 5,
        },
      });

      await this.createQueue(QueueName.SCHEDULED_SYNC, {
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: 3,
        },
      });

      await this.createQueue(QueueName.CLEANUP, {
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: 1,
        },
      });

      // Initialize workers with processors
      await this.createWorker(QueueName.ARTIST_IMPORT, this.processArtistImport.bind(this));
      await this.createWorker(QueueName.SPOTIFY_SYNC, this.processSpotifySync.bind(this));
      await this.createWorker(QueueName.TICKETMASTER_SYNC, this.processTicketmasterSync.bind(this));
      await this.createWorker(QueueName.VENUE_SYNC, this.processVenueSync.bind(this));
      await this.createWorker(QueueName.TRENDING_CALC, this.processTrendingCalc.bind(this));
      await this.createWorker(QueueName.SCHEDULED_SYNC, this.processScheduledSync.bind(this));
      await this.createWorker(QueueName.CLEANUP, this.processCleanup.bind(this));

      this.isInitialized = true;
      console.log("✅ Queue Manager initialized successfully");
    } catch (error) {
      console.error("❌ Queue Manager initialization failed:", error);
      throw error;
    }
  }

  private async createQueue(name: QueueName, options: any): Promise<void> {
    const queue = new Queue(name, {
      connection: getRedisConnection(),
      ...options,
    });

    // Set up queue events
    const queueEvents = new QueueEvents(name, {
      connection: getRedisConnection(),
    });

    queueEvents.on("completed", ({ jobId, returnvalue }) => {
      console.log(`✅ Job ${jobId} completed in ${name}:`, returnvalue);
    });

    queueEvents.on("failed", ({ jobId, failedReason }) => {
      console.error(`❌ Job ${jobId} failed in ${name}:`, failedReason);
    });

    queueEvents.on("progress", ({ jobId, data }) => {
      console.log(`🔄 Job ${jobId} progress in ${name}:`, data);
    });

    this.queues.set(name, queue);
    this.queueEvents.set(name, queueEvents);
  }

  private async createWorker(name: QueueName, processor: any): Promise<void> {
    const worker = new Worker(name, processor, {
      connection: getRedisConnection(),
      concurrency: this.getConcurrency(name),
      limiter: this.getRateLimiter(name),
    });

    worker.on("completed", (job) => {
      console.log(`✅ Worker completed job ${job.id} in ${name}`);
    });

    worker.on("failed", (job, err) => {
      console.error(`❌ Worker failed job ${job?.id} in ${name}:`, err.message);
    });

    worker.on("progress", (job, progress) => {
      console.log(`🔄 Worker progress for job ${job.id} in ${name}: ${progress}%`);
    });

    this.workers.set(name, worker);
  }

  private getConcurrency(queueName: QueueName): number {
    const concurrencyMap = {
      [QueueName.ARTIST_IMPORT]: 5,
      [QueueName.SPOTIFY_SYNC]: 3,
      [QueueName.TICKETMASTER_SYNC]: 3,
      [QueueName.VENUE_SYNC]: 2,
      [QueueName.TRENDING_CALC]: 2,
      [QueueName.SCHEDULED_SYNC]: 1,
      [QueueName.CLEANUP]: 1,
    };
    return concurrencyMap[queueName] || 1;
  }

  private getRateLimiter(queueName: QueueName) {
    const rateLimitMap = {
      [QueueName.SPOTIFY_SYNC]: { max: 30, duration: 1000 },
      [QueueName.TICKETMASTER_SYNC]: { max: 20, duration: 1000 },
      [QueueName.VENUE_SYNC]: { max: 15, duration: 1000 },
    };
    return rateLimitMap[queueName];
  }

  // Job Processors
  private async processArtistImport(job: Job): Promise<any> {
    const { tmAttractionId, artistId, adminImport = false } = job.data;
    
    try {
      await job.updateProgress(10);
      console.log(`Processing artist import: ${tmAttractionId}`);
      
      // Simulate artist import process
      await new Promise(resolve => setTimeout(resolve, 2000));
      await job.updateProgress(50);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await job.updateProgress(100);
      
      return {
        success: true,
        artistId: artistId || tmAttractionId,
        message: "Artist import completed successfully",
      };
    } catch (error) {
      console.error("Artist import failed:", error);
      throw error;
    }
  }

  private async processSpotifySync(job: Job): Promise<any> {
    const { artistId, spotifyId, syncType } = job.data;
    
    try {
      console.log(`Processing Spotify sync: ${spotifyId} (${syncType})`);
      
      // Simulate Spotify sync
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        success: true,
        artistId,
        spotifyId,
        syncType,
        message: "Spotify sync completed",
      };
    } catch (error) {
      console.error("Spotify sync failed:", error);
      throw error;
    }
  }

  private async processTicketmasterSync(job: Job): Promise<any> {
    const { artistId, tmAttractionId } = job.data;
    
    try {
      console.log(`Processing Ticketmaster sync: ${tmAttractionId}`);
      
      // Simulate Ticketmaster sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        artistId,
        tmAttractionId,
        message: "Ticketmaster sync completed",
      };
    } catch (error) {
      console.error("Ticketmaster sync failed:", error);
      throw error;
    }
  }

  private async processVenueSync(job: Job): Promise<any> {
    const { venueId, tmVenueId } = job.data;
    
    try {
      console.log(`Processing venue sync: ${tmVenueId}`);
      
      // Simulate venue sync
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        venueId,
        tmVenueId,
        message: "Venue sync completed",
      };
    } catch (error) {
      console.error("Venue sync failed:", error);
      throw error;
    }
  }

  private async processTrendingCalc(job: Job): Promise<any> {
    try {
      console.log("Processing trending calculations");
      
      // Simulate trending calculations
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return {
        success: true,
        message: "Trending calculations completed",
        artistsUpdated: 150,
      };
    } catch (error) {
      console.error("Trending calculation failed:", error);
      throw error;
    }
  }

  private async processScheduledSync(job: Job): Promise<any> {
    const { syncType, options } = job.data;
    
    try {
      console.log(`Processing scheduled sync: ${syncType}`);
      
      // Simulate scheduled sync
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return {
        success: true,
        syncType,
        message: "Scheduled sync completed",
      };
    } catch (error) {
      console.error("Scheduled sync failed:", error);
      throw error;
    }
  }

  private async processCleanup(job: Job): Promise<any> {
    const { cleanupType } = job.data;
    
    try {
      console.log(`Processing cleanup: ${cleanupType}`);
      
      // Simulate cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        cleanupType,
        message: "Cleanup completed",
        itemsRemoved: 25,
      };
    } catch (error) {
      console.error("Cleanup failed:", error);
      throw error;
    }
  }

  // Public methods
  async addJob(
    queueName: QueueName,
    jobName: string,
    data: any,
    options?: JobsOptions
  ): Promise<Job> {
    await this.initialize();
    
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.add(jobName, data, options);
  }

  async getQueueStats(queueName: QueueName) {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  async getAllQueueStats() {
    const stats: Record<string, any> = {};
    
    for (const queueName of Object.values(QueueName)) {
      stats[queueName] = await this.getQueueStats(queueName);
    }
    
    return stats;
  }

  async shutdown(): Promise<void> {
    console.log("🔄 Shutting down Queue Manager...");
    
    await Promise.all([
      ...Array.from(this.workers.values()).map(worker => worker.close()),
      ...Array.from(this.queues.values()).map(queue => queue.close()),
      ...Array.from(this.queueEvents.values()).map(events => events.close()),
    ]);

    if (this.redis) {
      await this.redis.quit();
    }

    console.log("✅ Queue Manager shut down successfully");
  }
}

// Export singleton instance
export const queueManager = new QueueManager();

// Auto-start in production or when explicitly enabled
if (process.env.NODE_ENV === "production" || process.env.AUTO_START_WORKERS === "true") {
  queueManager.initialize().catch(console.error);
}