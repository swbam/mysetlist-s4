export interface ImportProgress {
    stage: "initializing" | "syncing-identifiers" | "importing-songs" | "importing-shows" | "creating-setlists" | "completed" | "failed";
    progress: number;
    message: string;
    error?: string;
    completedAt?: string;
    artistId?: string;
    totalSongs?: number;
    totalShows?: number;
    totalVenues?: number;
}
export interface ImportResult {
    success: boolean;
    artistId: string;
    slug: string;
    totalSongs: number;
    totalShows: number;
    totalVenues: number;
    importDuration: number;
    stages: ImportProgress[];
}
export declare class ArtistImportOrchestrator {
    private spotifyClient;
    private ticketmasterClient;
    private errorHandler;
    private progressCallback;
    constructor(progressCallback?: (progress: ImportProgress) => Promise<void>);
    /**
     * Comprehensive artist import following the optimal timing strategy
     */
    importArtist(tmAttractionId: string): Promise<ImportResult>;
    /**
     * Update import progress
     */
    private updateProgress;
    /**
     * Helper methods
     */
    private generateSlug;
    private isArtistNameMatch;
}
//# sourceMappingURL=artist-import-orchestrator.d.ts.map