import { SetlistFmSetlist } from "../types/setlistfm";
export declare class SetlistSyncService {
    private setlistFmClient;
    private spotifyClient;
    constructor();
    syncSetlistFromSetlistFm(setlistData: SetlistFmSetlist): Promise<void>;
    private processSongsFromSet;
    createDefaultSetlists(artistId: string): Promise<{
        upcomingShows: number;
        createdSetlists: number;
        skipped: number;
    }>;
    /**
     * Ensures initial setlists exist for new shows
     * Creates 5-song initial setlist with songs randomly selected from artist's non-live catalog
     * Optionally weights by popularity
     */
    ensureInitialSetlists(showId: string, options?: {
        songCount?: number;
        weightByPopularity?: boolean;
        excludeLive?: boolean;
    }): Promise<{
        created: boolean;
        songCount: number;
        skippedLive: number;
    }>;
    /**
     * Checks if a track is likely a live recording
     */
    private isLiveTrack;
    syncSetlistByShowId(showId: string): Promise<void>;
}
//# sourceMappingURL=setlist-sync.d.ts.map