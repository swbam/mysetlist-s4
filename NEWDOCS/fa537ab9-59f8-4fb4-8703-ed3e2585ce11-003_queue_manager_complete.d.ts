import { Job, JobsOptions } from "bullmq";
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
declare class QueueManager {
    private queues;
    private workers;
    private queueEvents;
    private isInitialized;
    private shutdownPromise?;
    initialize(): Promise<void>;
    private createQueue;
    private createWorker;
    private getProcessor;
    private logJobToDatabase;
    addJob<T>(queueName: QueueName, jobName: string, data: T, options?: JobsOptions): Promise<Job>;
    getQueueStats(queueName: QueueName): Promise<{
        name: QueueName;
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        total: number;
    } | null>;
    getAllStats(): Promise<({
        name: QueueName;
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        total: number;
    } | null)[]>;
    getHealthStatus(): Promise<{
        healthy: boolean;
        initialized: boolean;
        queues: number;
        workers: number;
        redis: boolean;
        errors: string[];
    }>;
    pauseQueue(queueName: QueueName): Promise<void>;
    resumeQueue(queueName: QueueName): Promise<void>;
    cleanQueue(queueName: QueueName, grace?: number): Promise<void>;
    shutdown(): Promise<void>;
    private _performShutdown;
    addArtistImportJob(data: ArtistImportJobData, options?: JobsOptions): Promise<Job>;
    addSpotifySyncJob(data: SpotifySyncJobData, options?: JobsOptions): Promise<Job>;
    addScheduledSyncJob(data: ScheduledSyncJobData, options?: JobsOptions): Promise<Job>;
}
export declare const queueManager: QueueManager;
export { QueueName, Priority };
export type { ArtistImportJobData, SpotifySyncJobData, ScheduledSyncJobData };
//# sourceMappingURL=fa537ab9-59f8-4fb4-8703-ed3e2585ce11-003_queue_manager_complete.d.ts.map