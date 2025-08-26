import { Job } from "bullmq";
interface ArtistImportJobData {
    tmAttractionId: string;
    artistId?: string;
    priority?: number;
    adminImport?: boolean;
    userId?: string;
    phase1Complete?: boolean;
    syncOnly?: boolean;
}
interface ImportResult {
    success: boolean;
    artistId: string;
    slug: string;
    totalSongs: number;
    totalShows: number;
    totalVenues: number;
    importDuration: number;
    phaseTimings: {
        phase1Duration: number;
        phase2Duration: number;
        phase3Duration: number;
    };
}
export declare class ArtistImportProcessor {
    private static spotifyClient;
    private static ticketmasterClient;
    private static redis;
    static process(job: Job<ArtistImportJobData>): Promise<ImportResult>;
    private static executePhase1;
    private static executePhase2;
    private static executePhase3;
    private static createInitialSetlists;
    private static generateUniqueSlug;
    private static generateShowSlug;
    private static getShowStatus;
    private static isLiveTrack;
    private static isRemixTrack;
}
export default ArtistImportProcessor;
//# sourceMappingURL=959a34db-d6a2-40bb-a2aa-93c2d2077d3f-004_artist_import_processor.d.ts.map