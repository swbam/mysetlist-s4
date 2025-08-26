interface ImportStatusUpdate {
    stage: "initializing" | "syncing-identifiers" | "importing-songs" | "importing-shows" | "creating-setlists" | "completed" | "failed";
    progress: number;
    message: string;
    error?: string;
    job_id?: string;
    artist_name?: string;
    total_songs?: number;
    total_shows?: number;
    total_venues?: number;
    completed_at?: Date;
    phase_timings?: Record<string, number>;
    started_at?: Date;
}
interface ImportStatusResponse {
    artistId: string;
    stage: string;
    progress: number;
    message: string;
    error?: string;
    jobId?: string;
    artistName?: string;
    totalSongs?: number;
    totalShows?: number;
    totalVenues?: number;
    completedAt?: Date;
    startedAt?: Date;
    phaseTimings?: Record<string, number>;
    estimatedTimeRemaining?: number;
    timestamp: string;
}
export declare class ImportStatusManager {
    private static redis;
    /**
     * Update import status for an artist
     * Writes to both database and Redis for real-time updates
     */
    static updateImportStatus(artistId: string, update: ImportStatusUpdate): Promise<void>;
    /**
     * Get import status for an artist
     * Tries Redis first, falls back to database
     */
    static getImportStatus(identifier: string, // artistId or jobId
    type?: 'artist' | 'job'): Promise<ImportStatusResponse | null>;
    /**
     * Get all active import statuses
     */
    static getActiveImports(): Promise<ImportStatusResponse[]>;
    /**
     * Clean up completed import statuses older than specified time
     */
    static cleanupCompletedImports(olderThanHours?: number): Promise<number>;
    /**
     * Calculate estimated time remaining based on progress and stage
     */
    private static calculateTimeRemaining;
    /**
     * Create a new import session
     */
    static createImportSession(artistId: string, jobId: string): Promise<void>;
    /**
     * Mark import as failed with error details
     */
    static markImportFailed(artistId: string, error: string, jobId?: string): Promise<void>;
    /**
     * Mark import as completed
     */
    static markImportCompleted(artistId: string, totals: {
        songs?: number;
        shows?: number;
        venues?: number;
    }, jobId?: string): Promise<void>;
    /**
     * Get import statistics
     */
    static getImportStatistics(days?: number): Promise<{
        totalImports: number;
        successfulImports: number;
        failedImports: number;
        averageDuration: number;
        inProgress: number;
    }>;
}
export declare const updateImportStatus: typeof ImportStatusManager.updateImportStatus;
export declare const getImportStatus: typeof ImportStatusManager.getImportStatus;
export type { ImportStatusUpdate, ImportStatusResponse };
//# sourceMappingURL=95507095-cd89-4b2a-925b-c53e302a52c7-006_import_status_enhanced.d.ts.map