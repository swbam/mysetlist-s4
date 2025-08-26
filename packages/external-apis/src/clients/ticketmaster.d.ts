import { BaseAPIClient, APIClientConfig } from "./base";
import type { TicketmasterEvent, TicketmasterVenue } from "../types/ticketmaster";
export declare class TicketmasterClient extends BaseAPIClient {
    constructor(config: Omit<APIClientConfig, "baseURL">);
    protected getAuthHeaders(): Record<string, string>;
    searchEvents(options: {
        keyword?: string;
        attractionId?: string;
        city?: string;
        stateCode?: string;
        countryCode?: string;
        radius?: number;
        startDateTime?: string;
        endDateTime?: string;
        size?: number;
        page?: number;
        classificationName?: string;
        sort?: string;
    }): Promise<{
        _embedded?: {
            events: TicketmasterEvent[];
        };
        page: any;
    }>;
    getEvent(eventId: string): Promise<TicketmasterEvent>;
    searchVenues(options: {
        keyword?: string;
        city?: string;
        stateCode?: string;
        countryCode?: string;
        size?: number;
        page?: number;
    }): Promise<{
        _embedded?: {
            venues: TicketmasterVenue[];
        };
        page: any;
    }>;
    getVenue(venueId: string): Promise<TicketmasterVenue>;
    searchAttractions(options: {
        keyword?: string;
        size?: number;
        classificationName?: string;
        classificationId?: string;
    }): Promise<{
        _embedded?: {
            attractions: any[];
        };
        page: any;
    }>;
    getAttraction(attractionId: string): Promise<any>;
}
//# sourceMappingURL=ticketmaster.d.ts.map