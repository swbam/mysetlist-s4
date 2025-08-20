/**
 * Enhanced Ticketmaster Discovery API Client
 * Extends BaseApiClient with comprehensive Ticketmaster functionality and robust error handling
 */

import { BaseApiClient, type ApiClientConfig, type ApiResponse } from './base-client';
import { env } from '../../env';

const TICKETMASTER_BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

// Ticketmaster API Interfaces
export interface TicketmasterEvent {
  id: string;
  name?: string;
  type?: string;
  test?: boolean;
  url?: string;
  locale?: string;
  images?: Array<{
    ratio?: string;
    url: string;
    width?: number;
    height?: number;
    fallback?: boolean;
  }>;
  sales?: {
    public?: {
      startDateTime?: string;
      startTBD?: boolean;
      startTBA?: boolean;
      endDateTime?: string;
    };
    presales?: Array<{
      startDateTime?: string;
      endDateTime?: string;
      name?: string;
    }>;
  };
  dates?: {
    start?: {
      localDate?: string;
      localTime?: string;
      dateTime?: string;
      dateTBD?: boolean;
      dateTBA?: boolean;
      timeTBA?: boolean;
      noSpecificTime?: boolean;
    };
    end?: {
      localDate?: string;
      localTime?: string;
      dateTime?: string;
      approximate?: boolean;
    };
    timezone?: string;
    status?: {
      code?: string;
    };
    spanMultipleDays?: boolean;
  };
  classifications?: Array<{
    primary?: boolean;
    segment?: {
      id: string;
      name: string;
    };
    genre?: {
      id: string;
      name: string;
    };
    subGenre?: {
      id: string;
      name: string;
    };
    type?: {
      id: string;
      name: string;
    };
    subType?: {
      id: string;
      name: string;
    };
    family?: boolean;
  }>;
  promoter?: {
    id: string;
    name: string;
    description?: string;
  };
  promoters?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  info?: string;
  pleaseNote?: string;
  priceRanges?: Array<{
    type: string;
    currency: string;
    min?: number;
    max?: number;
  }>;
  products?: Array<{
    name?: string;
    id: string;
    url?: string;
    type?: string;
    classifications?: Array<{
      primary?: boolean;
      segment?: { id: string; name: string };
      genre?: { id: string; name: string };
      subGenre?: { id: string; name: string };
      type?: { id: string; name: string };
      subType?: { id: string; name: string };
    }>;
  }>;
  seatmap?: {
    staticUrl?: string;
  };
  accessibility?: {
    ticketLimit?: number;
    info?: string;
  };
  ticketLimit?: {
    info?: string;
  };
  ageRestrictions?: {
    legalAgeEnforced?: boolean;
  };
  ticketing?: {
    allInclusivePricing?: {
      enabled?: boolean;
    };
  };
  _links?: {
    self: { href: string };
    attractions?: Array<{ href: string }>;
    venues?: Array<{ href: string }>;
  };
  _embedded?: {
    venues?: TicketmasterVenue[];
    attractions?: TicketmasterAttraction[];
  };
}

export interface TicketmasterVenue {
  id: string;
  name: string;
  type?: string;
  url?: string;
  locale?: string;
  images?: Array<{
    ratio?: string;
    url: string;
    width?: number;
    height?: number;
    fallback?: boolean;
  }>;
  postalCode?: string;
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
    line1?: string;
    line2?: string;
  };
  location?: {
    longitude: string;
    latitude: string;
  };
  markets?: Array<{
    name?: string;
    id?: string;
  }>;
  dmas?: Array<{
    id: number;
  }>;
  social?: {
    twitter?: {
      handle?: string;
    };
  };
  boxOfficeInfo?: {
    phoneNumberDetail?: string;
    openHoursDetail?: string;
    acceptedPaymentDetail?: string;
    willCallDetail?: string;
  };
  parkingDetail?: string;
  accessibleSeatingDetail?: string;
  generalInfo?: {
    generalRule?: string;
    childRule?: string;
  };
  upcomingEvents?: {
    _total: number;
    'mfx-be'?: number;
    'mfx-de'?: number;
    'mfx-us'?: number;
    'mfx-au'?: number;
    'mfx-at'?: number;
    'mfx-be'?: number;
    'mfx-ca'?: number;
    'mfx-dk'?: number;
    'mfx-fi'?: number;
    'mfx-fr'?: number;
    'mfx-de'?: number;
    'mfx-ie'?: number;
    'mfx-it'?: number;
    'mfx-lu'?: number;
    'mfx-mx'?: number;
    'mfx-nl'?: number;
    'mfx-no'?: number;
    'mfx-pl'?: number;
    'mfx-es'?: number;
    'mfx-se'?: number;
    'mfx-ch'?: number;
    'mfx-tr'?: number;
    'mfx-gb'?: number;
    'mfx-us'?: number;
    'tmr-us'?: number;
  };
  ada?: {
    adaPhones?: string;
    adaCustomCopy?: string;
    adaHours?: string;
  };
  _links?: {
    self: { href: string };
  };
}

export interface TicketmasterAttraction {
  id: string;
  name: string;
  type?: string;
  url?: string;
  locale?: string;
  images?: Array<{
    ratio?: string;
    url: string;
    width?: number;
    height?: number;
    fallback?: boolean;
  }>;
  classifications?: Array<{
    primary?: boolean;
    segment?: {
      id: string;
      name: string;
    };
    genre?: {
      id: string;
      name: string;
    };
    subGenre?: {
      id: string;
      name: string;
    };
    type?: {
      id: string;
      name: string;
    };
    subType?: {
      id: string;
      name: string;
    };
    family?: boolean;
  }>;
  upcomingEvents?: {
    _total: number;
    [market: string]: number;
  };
  externalLinks?: {
    youtube?: Array<{ url: string }>;
    twitter?: Array<{ url: string }>;
    itunes?: Array<{ url: string }>;
    lastfm?: Array<{ url: string }>;
    facebook?: Array<{ url: string }>;
    wiki?: Array<{ url: string }>;
    musicbrainz?: Array<{ id: string; url?: string }>;
    homepage?: Array<{ url: string }>;
    spotify?: Array<{ url: string }>;
    instagram?: Array<{ url: string }>;
  };
  aliases?: string[];
  _links?: {
    self: { href: string };
  };
}

export interface TicketmasterPage {
  size: number;
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface TicketmasterResponse<T> {
  _embedded?: T;
  page?: TicketmasterPage;
  _links?: {
    self?: { href: string; templated?: boolean };
    first?: { href: string; templated?: boolean };
    next?: { href: string; templated?: boolean };
    prev?: { href: string; templated?: boolean };
    last?: { href: string; templated?: boolean };
  };
}

export interface TicketmasterEventsResponse {
  events?: TicketmasterEvent[];
}

export interface TicketmasterAttractionsResponse {
  attractions?: TicketmasterAttraction[];
}

export interface TicketmasterVenuesResponse {
  venues?: TicketmasterVenue[];
}

/**
 * Enhanced Ticketmaster Discovery API Client
 */
export class TicketmasterApiClient extends BaseApiClient {
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || env.TICKETMASTER_API_KEY;
    
    if (!key) {
      throw new Error('TICKETMASTER_API_KEY environment variable is required');
    }

    const config: ApiClientConfig = {
      baseUrl: TICKETMASTER_BASE_URL,
      rateLimitConfig: {
        requestsPerSecond: 5, // Ticketmaster rate limiting
        burstSize: 15,
      },
      retryConfig: {
        tries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        retryOn: (response) => response.status === 429 || response.status >= 500,
        timeout: 30000,
      },
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 120000,
        monitoringWindow: 300000,
      },
    };

    super(config);
    this.apiKey = key;
  }

  /**
   * Override get method to automatically add API key
   */
  protected async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
    options?: RequestInit & { retryConfig?: any }
  ): Promise<ApiResponse<T>> {
    const paramsWithApiKey = {
      ...params,
      apikey: this.apiKey,
    };

    return super.get<T>(endpoint, paramsWithApiKey, options);
  }

  /**
   * Search for events with comprehensive filtering options
   */
  async searchEvents(options: {
    keyword?: string;
    attractionId?: string;
    venueId?: string;
    promoterId?: string;
    classificationName?: string;
    classificationId?: string;
    marketId?: string;
    dmaId?: string;
    city?: string;
    countryCode?: string;
    stateCode?: string;
    postalCode?: string;
    latlong?: string;
    radius?: string;
    unit?: 'miles' | 'km';
    source?: string;
    onsaleStartDateTime?: string;
    onsaleEndDateTime?: string;
    localStartDateTime?: string;
    localStartEndDateTime?: string;
    localEndDateTime?: string;
    startDateTime?: string;
    endDateTime?: string;
    includeTBA?: 'yes' | 'no' | 'only';
    includeTBD?: 'yes' | 'no' | 'only';
    includeTest?: 'yes' | 'no' | 'only';
    size?: number;
    page?: number;
    sort?: string;
  } = {}): Promise<ApiResponse<TicketmasterResponse<TicketmasterEventsResponse>>> {
    const params: Record<string, string | number> = {};

    // Add all possible search parameters
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = String(value);
      }
    });

    // Set defaults
    if (!params.size) params.size = 200;
    if (!params.page) params.page = 0;
    if (!params.countryCode) params.countryCode = 'US';
    if (!params.classificationName) params.classificationName = 'Music';

    return this.get<TicketmasterResponse<TicketmasterEventsResponse>>('/events', params);
  }

  /**
   * Get events for a specific attraction with pagination
   */
  async getAttractionEvents(
    attractionId: string,
    options: {
      page?: number;
      size?: number;
      sort?: string;
      countryCode?: string;
    } = {}
  ): Promise<ApiResponse<TicketmasterResponse<TicketmasterEventsResponse>>> {
    const params = {
      attractionId: attractionId,
      size: options.size || 200,
      page: options.page || 0,
      sort: options.sort || 'date,asc',
      countryCode: options.countryCode || 'US',
    };

    return this.get<TicketmasterResponse<TicketmasterEventsResponse>>('/events', params);
  }

  /**
   * Iterator for all events by attraction with automatic pagination
   */
  async *iterateAttractionEvents(
    attractionId: string,
    options: {
      countryCode?: string;
      sort?: string;
    } = {}
  ): AsyncGenerator<TicketmasterEvent[], void, unknown> {
    let page = 0;
    let totalPages = 1;

    while (page < totalPages) {
      try {
        const response = await this.getAttractionEvents(attractionId, {
          page,
          size: 200,
          ...options,
        });

        const result = response.data;
        const events = result._embedded?.events || [];

        // Update total pages from response
        if (result.page) {
          totalPages = result.page.totalPages;
        }

        console.log(
          `Ticketmaster: Retrieved page ${page + 1}/${totalPages} with ${events.length} events ` +
          `for attraction ${attractionId}`
        );

        yield events;
        page++;

        // Rate limiting between pages
        if (page < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

      } catch (error: any) {
        console.error(`Ticketmaster API error on page ${page} for attraction ${attractionId}:`, error);
        
        if (error.status === 404) {
          console.warn(`No events found for attraction ${attractionId}`);
          return;
        }
        
        if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw new Error(`Ticketmaster API client error: ${error.message}`);
        }
        
        throw error;
      }
    }
  }

  /**
   * Get event by ID
   */
  async getEvent(eventId: string): Promise<ApiResponse<TicketmasterEvent>> {
    return this.get<TicketmasterEvent>(`/events/${encodeURIComponent(eventId)}`);
  }

  /**
   * Search for attractions (artists/performers)
   */
  async searchAttractions(options: {
    keyword?: string;
    classificationName?: string;
    classificationId?: string;
    size?: number;
    page?: number;
    sort?: string;
    countryCode?: string;
  } = {}): Promise<ApiResponse<TicketmasterResponse<TicketmasterAttractionsResponse>>> {
    const params: Record<string, string | number> = {};

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = String(value);
      }
    });

    // Set defaults
    if (!params.size) params.size = 50;
    if (!params.page) params.page = 0;
    if (!params.classificationName) params.classificationName = 'Music';
    if (!params.countryCode) params.countryCode = 'US';
    if (!params.sort) params.sort = 'relevance,desc';

    return this.get<TicketmasterResponse<TicketmasterAttractionsResponse>>('/attractions', params);
  }

  /**
   * Get attraction by ID
   */
  async getAttraction(attractionId: string): Promise<ApiResponse<TicketmasterAttraction>> {
    return this.get<TicketmasterAttraction>(`/attractions/${encodeURIComponent(attractionId)}`);
  }

  /**
   * Search for venues
   */
  async searchVenues(options: {
    keyword?: string;
    city?: string;
    stateCode?: string;
    countryCode?: string;
    postalCode?: string;
    latlong?: string;
    radius?: string;
    unit?: 'miles' | 'km';
    size?: number;
    page?: number;
    sort?: string;
  } = {}): Promise<ApiResponse<TicketmasterResponse<TicketmasterVenuesResponse>>> {
    const params: Record<string, string | number> = {};

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = String(value);
      }
    });

    // Set defaults
    if (!params.size) params.size = 50;
    if (!params.page) params.page = 0;
    if (!params.countryCode) params.countryCode = 'US';

    return this.get<TicketmasterResponse<TicketmasterVenuesResponse>>('/venues', params);
  }

  /**
   * Get venue by ID
   */
  async getVenue(venueId: string): Promise<ApiResponse<TicketmasterVenue>> {
    return this.get<TicketmasterVenue>(`/venues/${encodeURIComponent(venueId)}`);
  }

  /**
   * Get events for a specific venue
   */
  async getVenueEvents(
    venueId: string,
    options: {
      page?: number;
      size?: number;
      sort?: string;
    } = {}
  ): Promise<ApiResponse<TicketmasterResponse<TicketmasterEventsResponse>>> {
    const params = {
      venueId: venueId,
      size: options.size || 200,
      page: options.page || 0,
      sort: options.sort || 'date,asc',
    };

    return this.get<TicketmasterResponse<TicketmasterEventsResponse>>('/events', params);
  }

  /**
   * Get classifications (genres, segments, etc.)
   */
  async getClassifications(options: {
    sort?: string;
    size?: number;
    page?: number;
  } = {}): Promise<ApiResponse<any>> {
    const params = {
      size: options.size || 50,
      page: options.page || 0,
      sort: options.sort || 'name,asc',
    };

    return this.get<any>('/classifications', params);
  }

  /**
   * Find attractions by external IDs (e.g., MusicBrainz, Spotify)
   */
  async findAttractionByExternalId(
    source: string,
    id: string
  ): Promise<ApiResponse<TicketmasterResponse<TicketmasterAttractionsResponse>>> {
    return this.get<TicketmasterResponse<TicketmasterAttractionsResponse>>('/attractions', {
      [source]: id,
      size: 1,
    });
  }

  /**
   * Get comprehensive event statistics
   */
  getEventStatistics(events: TicketmasterEvent[]) {
    const totalEvents = events.length;
    const venues = new Set(events.map(e => e._embedded?.venues?.[0]?.name).filter(Boolean));
    const cities = new Set(events.map(e => e._embedded?.venues?.[0]?.city?.name).filter(Boolean));
    const states = new Set(events.map(e => e._embedded?.venues?.[0]?.state?.name).filter(Boolean));
    const countries = new Set(events.map(e => e._embedded?.venues?.[0]?.country?.name).filter(Boolean));

    // Extract dates
    const dates = events
      .map(e => e.dates?.start?.localDate)
      .filter(Boolean)
      .map(date => new Date(date!))
      .sort();

    const upcomingEvents = events.filter(e => {
      const eventDate = e.dates?.start?.localDate;
      return eventDate && new Date(eventDate) > new Date();
    });

    const pastEvents = events.filter(e => {
      const eventDate = e.dates?.start?.localDate;
      return eventDate && new Date(eventDate) <= new Date();
    });

    return {
      totalEvents,
      upcomingEvents: upcomingEvents.length,
      pastEvents: pastEvents.length,
      uniqueVenues: venues.size,
      uniqueCities: cities.size,
      uniqueStates: states.size,
      uniqueCountries: countries.size,
      dateRange: {
        earliest: dates[0]?.toISOString().split('T')[0],
        latest: dates[dates.length - 1]?.toISOString().split('T')[0],
      },
      venues: Array.from(venues).slice(0, 10), // Top 10 venues
      cities: Array.from(cities).slice(0, 10), // Top 10 cities
    };
  }

  /**
   * Test API connectivity and rate limits
   */
  async testConnection(): Promise<{
    success: boolean;
    authenticated: boolean;
    rateLimit?: {
      remaining: number;
      reset: number;
    };
    error?: string;
  }> {
    try {
      const response = await this.searchEvents({
        size: 1,
        page: 0,
        countryCode: 'US',
      });

      return {
        success: true,
        authenticated: true,
        rateLimit: response.headers ? {
          remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
          reset: parseInt(response.headers['x-ratelimit-reset'] || '0'),
        } : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        authenticated: error.status !== 401 && error.status !== 403,
        error: error.message,
      };
    }
  }
}