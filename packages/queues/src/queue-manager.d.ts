import { Queue, Worker, QueueEvents, Job, JobsOptions, RepeatOptions } from "bullmq";
export declare enum QueueName {
    ARTIST_IMPORT = "artist-import",
    ARTIST_QUICK_SYNC = "artist-quick-sync",
    SPOTIFY_SYNC = "spotify-sync",
    SPOTIFY_CATALOG = "spotify-catalog",
    TICKETMASTER_SYNC = "ticketmaster-sync",
    VENUE_SYNC = "venue-sync",
    SETLIST_SYNC = "setlist-sync",
    IMAGE_PROCESSING = "image-processing",
    TRENDING_CALC = "trending-calc",
    CACHE_WARM = "cache-warm",
    SCHEDULED_SYNC = "scheduled-sync",
    CLEANUP = "cleanup-jobs",
    PROGRESS_UPDATE = "progress-update",
    WEBHOOK = "webhook-notify"
}
export declare enum Priority {
    CRITICAL = 1,// User-initiated imports
    HIGH = 5,// Real-time sync
    NORMAL = 10,// Standard background sync
    LOW = 20,// Catalog deep sync
    BACKGROUND = 50
}
export declare const queueConfigs: Record<QueueName, {
    concurrency: number;
    rateLimit?: {
        max: number;
        duration: number;
    };
    defaultJobOptions?: JobsOptions;
}>;
export declare class QueueManager {
    private static instance;
    private queues;
    private workers;
    private events;
    private constructor();
    static getInstance(): QueueManager;
    getQueue(name: QueueName): Queue;
    createWorker(name: QueueName, processor: (job: Job) => Promise<any>): Worker;
    getQueueEvents(name: QueueName): QueueEvents;
    addJob<T = any>(queueName: QueueName, jobName: string, data: T, options?: JobsOptions): Promise<Job<T>>;
    addBulkJobs<T = any>(queueName: QueueName, jobs: Array<{
        name: string;
        data: T;
        opts?: JobsOptions;
    }>): Promise<Job<T>[]>;
    scheduleRecurringJob(queueName: QueueName, jobName: string, data: any, repeatOptions: RepeatOptions, jobOptions?: JobsOptions): Promise<Job>;
    getJobCounts(queueName: QueueName): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }>;
    cleanQueue(queueName: QueueName, grace?: number, limit?: number, status?: "completed" | "failed"): Promise<string[]>;
    pauseQueue(queueName: QueueName): Promise<void>;
    resumeQueue(queueName: QueueName): Promise<void>;
    closeAll(): Promise<void>;
    getQueueMetrics(queueName: QueueName): Promise<{
        name: string;
        counts: any;
        isPaused: boolean;
        workersCount: number;
    }>;
    getAllMetrics(): Promise<any[]>;
}
export declare const queueManager: QueueManager;
//# sourceMappingURL=queue-manager.d.ts.map