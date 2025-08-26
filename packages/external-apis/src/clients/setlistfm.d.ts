import { BaseAPIClient, APIClientConfig } from "./base";
import { SetlistFmSetlist } from "../types/setlistfm";
export declare class SetlistFmClient extends BaseAPIClient {
    constructor(config: Omit<APIClientConfig, "baseURL">);
    protected getAuthHeaders(): Record<string, string>;
    searchSetlists(options: {
        artistName?: string;
        artistMbid?: string;
        venueName?: string;
        cityName?: string;
        date?: string;
        year?: number;
        p?: number;
    }): Promise<{
        setlist: SetlistFmSetlist[];
    }>;
    getSetlist(setlistId: string): Promise<SetlistFmSetlist>;
    getArtistSetlists(artistMbid: string, page?: number): Promise<{
        setlist: SetlistFmSetlist[];
    }>;
    getVenueSetlists(venueId: string, page?: number): Promise<{
        setlist: SetlistFmSetlist[];
    }>;
}
//# sourceMappingURL=setlistfm.d.ts.map