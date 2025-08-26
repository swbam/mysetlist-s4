type SetlistFmVenue = {
    id: string;
    name: string;
    city: {
        name: string;
        stateCode?: string;
        country: {
            code: string;
            name?: string;
        };
        coords?: {
            lat: number | null;
            long: number | null;
        };
    };
};
import { TicketmasterVenue } from "../types/ticketmaster";
export declare class VenueSyncService {
    private ticketmasterClient;
    private setlistFmClient;
    constructor();
    syncVenueFromTicketmaster(ticketmasterVenue: TicketmasterVenue): Promise<void>;
    syncVenueFromSetlistFm(setlistFmVenue: SetlistFmVenue): Promise<void>;
    /**
     * Unified venue sync method that handles different venue data sources
     * Accepts data from Ticketmaster, Setlist.fm, or other sources
     */
    syncVenue(venueData: any): Promise<void>;
    /**
     * Handle generic venue data that doesn't match specific API formats
     */
    private syncGenericVenue;
    syncVenuesByCity(city: string, stateCode?: string, countryCode?: string): Promise<void>;
    syncMajorVenues(): Promise<void>;
    private generateSlug;
    private getTimezone;
}
export {};
//# sourceMappingURL=venue-sync.d.ts.map