import { type APIClientConfig, BaseAPIClient } from "./base";

export interface TicketmasterEvent {
  id: string;
  name: string;
  type: string;
  url: string;
  locale: string;
  images?: Array<{
    url: string;
    width: number;
    height: number;
    ratio?: string;
  }>;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
      dateTime?: string;
    };
    status: {
      code: string;
    };
  };
  priceRanges?: Array<{
    type: string;
    currency: string;
    min: number;
    max: number;
  }>;
  _embedded?: {
    venues?: TicketmasterVenue[];
    attractions?: Array<{
      id: string;
      name: string;
      type: string;
      url: string;
    }>;
  };
}

export interface TicketmasterVenue {
  id: string;
  name: string;
  type: string;
  url: string;
  locale: string;
  timezone?: string;
  city?: {
    name: string;
  };
  state?: {
    name: string;
    stateCode: string;
  };
  country?: {
    name: string;
    countryCode: string;
  };
  address?: {
    line1: string;
    line2?: string;
  };
  location?: {
    longitude: string;
    latitude: string;
  };
  postalCode?: string;
  generalInfo?: {
    generalRule?: string;
    childRule?: string;
  };
  capacity?: number;
  images?: Array<{
    url: string;
    width: number;
    height: number;
    ratio?: string;
  }>;
}

export class TicketmasterClient extends BaseAPIClient {
  constructor(config: Omit<APIClientConfig, "baseURL">) {
    super({
      ...config,
      baseURL: "https://app.ticketmaster.com/discovery/v2",
      // More conservative rate limiting - 200 requests per hour to avoid 429s
      rateLimit: { requests: 200, window: 3600 }, // 200 requests per hour
      cache: { defaultTTL: 1800 }, // 30 minutes default cache
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      apikey: this.apiKey!,
    };
  }

  protected override async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string,
    cacheTtl?: number,
  ): Promise<T> {
    // Construct URL properly handling existing query parameters
    let url: URL;

    // Check if endpoint already has query parameters
    if (endpoint.includes("?")) {
      // If endpoint has parameters, construct the full URL and add apikey
      const fullUrl = `${this.baseURL}/${endpoint}&apikey=${this.apiKey!}`;
      url = new URL(fullUrl);
    } else {
      // If no existing parameters, use normal URL construction
      url = new URL(endpoint, this.baseURL);
      url.searchParams.append("apikey", this.apiKey!);
    }

    // Check cache first if key provided and cache is available
    if (cacheKey && this.cache) {
      try {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          return JSON.parse(cached as string) as T;
        }
      } catch (_error) {
        // Cache miss or error, continue with API call
      }
    }

    // Rate limits are handled in the base class makeRequest method

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Ticketmaster API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as T;

    // Cache if key provided and cache is available
    if (cacheKey && cacheTtl && this.cache) {
      try {
        await this.cache.set(cacheKey, data, cacheTtl);
      } catch (_error) {}
    }

    return data;
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
      `events.json?${params.toString()}`,
      {},
      `ticketmaster:events:${params.toString()}`,
      900, // 15 minutes cache
    );
  }

  async getEvent(eventId: string): Promise<TicketmasterEvent> {
    return this.makeRequest<TicketmasterEvent>(
      `events/${eventId}.json`,
      {},
      `ticketmaster:event:${eventId}`,
      1800,
    );
  }

  /**
   * Search Ticketmaster attractions (artists).
   * Mirrors the Ticketmaster Discovery API /attractions.json endpoint.
   * Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/#search-attraction-v2
   */
  async searchAttractions(options: {
    keyword?: string;
    size?: number;
    page?: number;
    classificationName?: string;
    sort?: string;
  }): Promise<{ _embedded?: { attractions: any[] }; page: any }> {
    const params = new URLSearchParams();

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    // Pass the endpoint without parameters, let makeRequest handle URL construction
    const endpoint = `attractions.json`;
    const fullEndpoint = params.toString()
      ? `${endpoint}?${params.toString()}`
      : endpoint;

    return this.makeRequest(
      fullEndpoint,
      {},
      `ticketmaster:attractions:${params.toString()}`,
      3600, // 1 hour cache
    );
  }

  async searchVenues(options: {
    keyword?: string;
    city?: string;
    stateCode?: string;
    countryCode?: string;
    size?: number;
    page?: number;
    sort?: string;
  }): Promise<{ _embedded?: { venues: TicketmasterVenue[] }; page: any }> {
    const params = new URLSearchParams();

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest(
      `venues.json?${params}`,
      {},
      `ticketmaster:venues:${params.toString()}`,
      3600,
    );
  }

  async getVenue(venueId: string): Promise<TicketmasterVenue> {
    return this.makeRequest<TicketmasterVenue>(
      `venues/${venueId}.json`,
      {},
      `ticketmaster:venue:${venueId}`,
      3600,
    );
  }

  async getAttraction(attractionId: string): Promise<any> {
    return this.makeRequest(
      `attractions/${attractionId}.json`,
      {},
      `ticketmaster:attraction:${attractionId}`,
      3600,
    );
  }

  async getUpcomingEvents(
    artistName: string,
    options: {
      size?: number;
      sort?: string;
      startDateTime?: string;
      endDateTime?: string;
    } = {},
  ): Promise<TicketmasterEvent[]> {
    const result = await this.searchEvents({
      keyword: artistName,
      classificationName: "Music",
      ...options,
    });

    return result._embedded?.events || [];
  }

  async getArtistDetails(attractionId: string): Promise<{
    id: string;
    name: string;
    imageUrl?: string;
    genres?: string[];
    popularity?: number;
  } | null> {
    try {
      const attraction = await this.getAttraction(attractionId);

      if (!attraction) {
        return null;
      }

      // Extract image URL from images array
      const imageUrl =
        attraction.images?.find(
          (img: any) => img.width >= 300 && img.height >= 300,
        )?.url || attraction.images?.[0]?.url;

      // Extract genres from classifications
      const genres: string[] = [];
      if (attraction.classifications) {
        attraction.classifications.forEach((classification: any) => {
          if (classification.genre?.name) {
            genres.push(classification.genre.name);
          }
          if (classification.subGenre?.name) {
            genres.push(classification.subGenre.name);
          }
        });
      }

      return {
        id: attraction.id,
        name: attraction.name,
        imageUrl,
        genres: [...new Set(genres)], // Remove duplicates
        popularity: attraction.upcomingEvents?._total || 0,
      };
    } catch (error) {
      console.error(
        `Error fetching artist details for ${attractionId}:`,
        error,
      );
      return null;
    }
  }
}
