export interface SyncOptions {
    artists?: boolean;
    venues?: boolean;
    shows?: boolean;
    setlists?: boolean;
    city?: string;
    stateCode?: string;
    artistName?: string;
    startDate?: string;
    endDate?: string;
}
export interface SyncJob {
    id: string;
    type: string;
    status: "running" | "completed" | "failed" | "pending";
    startTime: Date;
    endTime?: Date;
    progress?: number;
    error?: string;
    result?: any;
}
export interface JobStats {
    totalJobs: number;
    runningJobs: number;
    completedJobs: number;
    failedJobs: number;
    pendingJobs: number;
}
export interface HealthStatus {
    isHealthy: boolean;
    lastSyncTime?: Date;
    errors: string[];
}
export declare class SyncScheduler {
    private artistSync;
    private venueSync;
    private showSync;
    private setlistSync;
    private jobs;
    private lastSyncTime?;
    private currentErrors;
    constructor();
    runInitialSync(): Promise<void>;
    runDailySync(): Promise<void>;
    syncByLocation(city: string, stateCode?: string): Promise<void>;
    syncArtistData(artistName: string): Promise<void>;
    syncCustom(options: SyncOptions): Promise<void>;
    syncShowDetails(showId: string): Promise<void>;
    private createJob;
    private startJob;
    private completeJob;
    private failJob;
    getJob(jobId: string): SyncJob | undefined;
    getAllJobs(): SyncJob[];
    getJobStats(): JobStats;
    getHealthStatus(): HealthStatus;
    clearOldJobs(): void;
    startScheduler(): Promise<void>;
    stopScheduler(): Promise<void>;
    runJobNow(jobId: string): Promise<void>;
    enableJob(jobId: string): boolean;
    disableJob(jobId: string): boolean;
    deleteJob(jobId: string): boolean;
    scheduleJob(type: string, _schedule: string): Promise<SyncJob>;
    updateJobSchedule(jobId: string, _schedule: string): boolean;
}
//# sourceMappingURL=sync-scheduler.d.ts.map