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
    return {};
  }

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string,
    cacheTTL?: number,
  ): Promise<T> {
    // Add apikey as query parameter for Ticketmaster
    const separator = endpoint.includes('?') ? '&' : '?';
    const modifiedEndpoint = `${endpoint}${separator}apikey=${this.apiKey!}`;
    
    return super.makeRequest(modifiedEndpoint, options, cacheKey, cacheTTL);
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
    sort?: string;
  }): Promise<{ _embedded?: { attractions: any[] }; page: any }> {
    const params = new URLSearchParams();

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    // Add API key to params
    params.append('apikey', this.apiKey!);

    const url = `${this.baseURL}/attractions.json?${params}`;
    console.log('Ticketmaster search URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }

  async *iterateEventsByAttraction(attractionId: string): AsyncGenerator<TicketmasterEvent[], void, unknown> {
    let page = 0;
    let totalPages = 1;

    while (page < totalPages) {
      const params = new URLSearchParams({
        attractionId: attractionId,
        size: "200",
        page: page.toString(),
      });

      const response = await this.makeRequest<{ _embedded?: { events: TicketmasterEvent[] }; page: any }>(
        `/events.json?${params}`,
        {},
        `ticketmaster:events:attraction:${attractionId}:${page}`,
        900, // 15 minutes cache
      );

      totalPages = response.page?.totalPages ?? 0;
      const events = response._embedded?.events ?? [];
      
      if (events.length > 0) {
        yield events;
      }
      
      page++;
    }
  }
}
