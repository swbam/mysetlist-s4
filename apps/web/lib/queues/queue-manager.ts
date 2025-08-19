import { SimpleQueue } from "./redis-config";

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

// Job options interface
export interface JobOptions {
  attempts?: number;
  delay?: number;
  priority?: Priority;
}

// Queue configurations with optimal settings
export const queueConfigs: Record<QueueName, {
  concurrency: number;
  rateLimit?: { max: number; duration: number };
  defaultJobOptions?: JobOptions;
}> = {
  [QueueName.ARTIST_IMPORT]: {
    concurrency: 5,
    defaultJobOptions: {
      attempts: 3,
    },
  },
  [QueueName.ARTIST_QUICK_SYNC]: {
    concurrency: 10,
    defaultJobOptions: { attempts: 2 },
  },
  [QueueName.SPOTIFY_SYNC]: {
    concurrency: 3,
    rateLimit: { max: 30, duration: 1000 },
    defaultJobOptions: { attempts: 5 },
  },
  [QueueName.SPOTIFY_CATALOG]: {
    concurrency: 2,
    rateLimit: { max: 20, duration: 1000 },
    defaultJobOptions: { attempts: 3 },
  },
  [QueueName.TICKETMASTER_SYNC]: {
    concurrency: 3,
    rateLimit: { max: 20, duration: 1000 },
    defaultJobOptions: { attempts: 4 },
  },
  [QueueName.VENUE_SYNC]: {
    concurrency: 10,
    defaultJobOptions: { attempts: 3 },
  },
  [QueueName.SETLIST_SYNC]: {
    concurrency: 2,
    rateLimit: { max: 10, duration: 1000 },
    defaultJobOptions: { attempts: 3 },
  },
  [QueueName.IMAGE_PROCESSING]: {
    concurrency: 5,
    defaultJobOptions: { attempts: 2 },
  },
  [QueueName.TRENDING_CALC]: {
    concurrency: 1,
    defaultJobOptions: { attempts: 2 },
  },
  [QueueName.CACHE_WARM]: {
    concurrency: 5,
    defaultJobOptions: { attempts: 1 },
  },
  [QueueName.SCHEDULED_SYNC]: {
    concurrency: 3,
    defaultJobOptions: { attempts: 2 },
  },
  [QueueName.CLEANUP]: {
    concurrency: 1,
    defaultJobOptions: { attempts: 1 },
  },
  [QueueName.PROGRESS_UPDATE]: {
    concurrency: 20,
    defaultJobOptions: { attempts: 1 },
  },
  [QueueName.WEBHOOK]: {
    concurrency: 5,
    defaultJobOptions: { attempts: 3 },
  },
};

// Queue manager singleton
export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<QueueName, SimpleQueue> = new Map();
  private processors: Map<QueueName, boolean> = new Map();
  
  private constructor() {}
  
  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }
  
  // Get or create a queue
  getQueue(name: QueueName): SimpleQueue {
    if (!this.queues.has(name)) {
      const queue = new SimpleQueue(name);
      this.queues.set(name, queue);
    }
    return this.queues.get(name)!;
  }
  
  // Create a worker for a queue
  createWorker(
    name: QueueName,
    processor: (job: any) => Promise<any>
  ): void {
    if (this.processors.has(name)) {
      console.warn(`Processor for queue ${name} already exists`);
      return;
    }
    
    const queue = this.getQueue(name);
    this.processors.set(name, true);
    
    // Start processing in background
    queue.process(processor);
    console.log(`Started processor for queue ${name}`);
  }
  
  // Add a job to a queue
  async addJob<T = any>(
    queueName: QueueName,
    jobName: string,
    data: T,
    options?: JobOptions
  ): Promise<string> {
    const queue = this.getQueue(queueName);
    const config = queueConfigs[queueName];
    const jobOptions = { ...config.defaultJobOptions, ...options };
    return await queue.add(jobName, data, jobOptions);
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
    const waiting = await queue.getWaiting();
    return {
      waiting,
      active: 0,  // SimpleQueue doesn't track active separately
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  }
  
  // Clean old jobs
  async cleanQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.obliterate();
  }
  
  // Get queue metrics
  async getQueueMetrics(queueName: QueueName): Promise<{
    name: string;
    counts: any;
    isPaused: boolean;
    workersCount: number;
  }> {
    const counts = await this.getJobCounts(queueName);
    const hasProcessor = this.processors.has(queueName);
    
    return {
      name: queueName,
      counts,
      isPaused: false,
      workersCount: hasProcessor ? 1 : 0,
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