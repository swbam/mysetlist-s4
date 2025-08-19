import { BaseAPIClient, APIClientConfig } from "./base";
import type { TicketmasterEvent, TicketmasterVenue, TicketmasterAttraction } from "../types/ticketmaster";

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
    attractionId?: string;
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

  async getAttraction(attractionId: string): Promise<TicketmasterAttraction | null> {
    try {
      return await this.makeRequest<TicketmasterAttraction>(
        `/attractions/${encodeURIComponent(attractionId)}.json`,
        {},
        `ticketmaster:attraction:${attractionId}`,
        1800, // 30 minutes cache
      );
    } catch (error: any) {
      if (error.status === 404) {
        return null; // Attraction not found
      }
      throw error;
    }
  }

  async searchAttractions(options: {
    keyword?: string;
    classificationName?: string;
    countryCode?: string;
    size?: number;
    page?: number;
    sort?: string;
  }): Promise<{ _embedded?: { attractions: TicketmasterAttraction[] }; page: any }> {
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
      900, // 15 minutes cache
    );
  }

  async *iterateEventsByAttraction(attractionId: string): AsyncGenerator<TicketmasterEvent[], void, unknown> {
    let page = 0;
    let totalPages = 1;
    
    while (page < totalPages) {
      try {
        const params = new URLSearchParams({
          attractionId: attractionId,
          size: "200", // Maximum page size
          page: page.toString(),
          sort: "date,asc", // Sort by date ascending for consistent results
        });

        const data: any = await this.makeRequest(
          `/events.json?${params}`,
          {},
          `ticketmaster:events:attraction:${attractionId}:${page}`,
          900, // 15 minutes cache
        );

        // Update total pages from response
        if (data.page) {
          totalPages = data.page.totalPages || 1;
        }

        // Extract events from response
        const events = data._embedded?.events || [];
        
        yield events;
        page++;
        
        // Rate limiting: small delay between requests
        if (page < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error: any) {
        console.error(`Ticketmaster API error on page ${page} for attraction ${attractionId}:`, error);
        
        // If it's a 404, the attraction might not exist or have no events
        if (error.status === 404) {
          console.warn(`No events found for attraction ${attractionId}`);
          return;
        }
        
        // If it's a client error (4xx), don't retry
        if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw new Error(`Ticketmaster API client error: ${error.message}`);
        }
        
        // For other errors, re-throw to let the retry logic handle it
        throw error;
      }
    }
  }
}
