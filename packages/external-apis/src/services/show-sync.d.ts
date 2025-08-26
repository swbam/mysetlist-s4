import { TicketmasterEvent } from "../types/ticketmaster";
import { SetlistFmSetlist } from "../types/setlistfm";
export declare class ShowSyncService {
    private ticketmasterClient;
    private setlistFmClient;
    private spotifyClient;
    private venueSyncService;
    private setlistSyncService;
    private errorHandler;
    constructor();
    syncShowFromTicketmaster(event: TicketmasterEvent): Promise<{
        isNew: boolean;
        isUpdated: boolean;
    }>;
    syncShowFromSetlistFm(setlist: SetlistFmSetlist): Promise<void>;
    syncUpcomingShows(options: {
        city?: string;
        stateCode?: string;
        keyword?: string;
        startDateTime?: string;
        endDateTime?: string;
    }): Promise<{
        newShows: number;
        updatedShows: number;
    }>;
    syncArtistShows(artistDbId: string): Promise<{
        upcomingShows: number;
        pastShows: number;
        newShows: number;
        updatedShows: number;
    }>;
    syncHistoricalSetlists(artistName: string): Promise<void>;
    private generateSlug;
    private generateShowSlug;
    private isArtistMatch;
    private mapTicketmasterStatus;
}
//# sourceMappingURL=show-sync.d.ts.map