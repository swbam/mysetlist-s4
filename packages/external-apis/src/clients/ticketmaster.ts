import { BaseAPIClient, APIClientConfig } from "./base";
import type { TicketmasterEvent, TicketmasterVenue } from "../types/ticketmaster";

export class TicketmasterClient extends BaseAPIClient {
  constructor(config: Omit<APIClientConfig, "baseURL">) {
    super({
      ...config,
      baseURL: "https://app.ticketmaster.com/discovery/v2",
      rateLimit: { requests: 5000, window: 24 * 3600 }, // 5000 requests per day
      cache: { defaultTTL: 1800 }, // 30 minutes default cache
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      apikey: this.apiKey!,
    };
  }

  async searchEvents(options: {
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
  }): Promise<{ _embedded?: { events: TicketmasterEvent[] }; page: any }> {
    const params = new URLSearchParams();

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest(
      `/events.json?${params}`,
      {},
      `ticketmaster:events:${params.toString()}`,
      900, // 15 minutes cache
    );
  }

  async getEvent(eventId: string): Promise<TicketmasterEvent> {
    return this.makeRequest<TicketmasterEvent>(
      `/events/${eventId}.json`,
      {},
      `ticketmaster:event:${eventId}`,
      1800,
    );
  }

  async searchVenues(options: {
    keyword?: string;
    city?: string;
    stateCode?: string;
    countryCode?: string;
    size?: number;
    page?: number;
  }): Promise<{ _embedded?: { venues: TicketmasterVenue[] }; page: any }> {
    const params = new URLSearchParams();

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest(
      `/venues.json?${params}`,
      {},
      `ticketmaster:venues:${params.toString()}`,
      3600,
    );
  }

  async getVenue(venueId: string): Promise<TicketmasterVenue> {
    return this.makeRequest<TicketmasterVenue>(
      `/venues/${venueId}.json`,
      {},
      `ticketmaster:venue:${venueId}`,
      3600,
    );
  }

  async searchAttractions(options: {
    keyword?: string;
    size?: number;
    classificationName?: string;
    classificationId?: string;
  }): Promise<{ _embedded?: { attractions: any[] }; page: any }> {
    const params = new URLSearchParams();

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest(
      `/attractions.json?${params}`,
      {},
      `ticketmaster:attractions:${params.toString()}`,
      3600,
    );
  }

  async getAttraction(attractionId: string): Promise<any> {
    // Use direct fetch to bypass BaseAPIClient issues
    const apiKey = this.apiKey || process.env["TICKETMASTER_API_KEY"];
    if (!apiKey) {
      throw new Error("Ticketmaster API key not configured");
    }

    const url = `https://app.ticketmaster.com/discovery/v2/attractions/${attractionId}.json?apikey=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Attraction not found: ${attractionId}`);
      }
      throw new Error(`Ticketmaster API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
}
