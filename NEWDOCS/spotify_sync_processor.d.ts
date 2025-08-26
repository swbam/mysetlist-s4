import { Job } from "bullmq";
interface SpotifySyncJobData {
    artistId: string;
    spotifyId: string;
    syncType: 'profile' | 'albums' | 'tracks' | 'full';
    options?: {
        includeCompilations?: boolean;
        includeAppearsOn?: boolean;
        skipLive?: boolean;
        forceRefresh?: boolean;
    };
}
interface SpotifySyncResult {
    success: boolean;
    artistId: string;
    syncType: string;
    songsUpdated: number;
    albumsProcessed: number;
    errors: string[];
    duration: number;
}
export declare class SpotifySyncProcessor {
    private static spotifyClient;
    static process(job: Job<SpotifySyncJobData>): Promise<SpotifySyncResult>;
    private static syncArtistProfile;
    private static syncArtistAlbums;
    private static syncArtistTopTracks;
    private static syncFullCatalog;
    private static updateArtistSongStats;
    private static isLiveTrack;
    private static isRemixTrack;
    private static processInBatches;
}
export default SpotifySyncProcessor;
//# sourceMappingURL=spotify_sync_processor.d.ts.map