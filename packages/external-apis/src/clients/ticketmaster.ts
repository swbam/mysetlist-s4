import { BaseAPIClient, APIClientConfig } from './base';

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
}

export class TicketmasterClient extends BaseAPIClient {
  constructor(config: Omit<APIClientConfig, 'baseURL'>) {
    super({
      ...config,
      baseURL: 'https://app.ticketmaster.com/discovery/v2',
      rateLimit: { requests: 5000, window: 24 * 3600 }, // 5000 requests per day
      cache: { defaultTTL: 1800 }, // 30 minutes default cache
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    // Ticketmaster uses API key in URL params, not headers
    return {};
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
      900 // 15 minutes cache
    );
  }

  async getEvent(eventId: string): Promise<TicketmasterEvent> {
    return this.makeRequest<TicketmasterEvent>(
      `/events/${eventId}.json`,
      {},
      `ticketmaster:event:${eventId}`,
      1800
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
      `/venues.json?${params}`,
      {},
      `ticketmaster:venues:${params.toString()}`,
      3600
    );
  }

  async getVenue(venueId: string): Promise<TicketmasterVenue> {
    return this.makeRequest<TicketmasterVenue>(
      `/venues/${venueId}.json`,
      {},
      `ticketmaster:venue:${venueId}`,
      3600
    );
  }

  async searchAttractions(options: {
    keyword?: string;
    size?: number;
    page?: number;
    sort?: string;
    classificationName?: string;
  }): Promise<any> {
    const params = new URLSearchParams();
    
    // Add API key to params
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      throw new Error('Ticketmaster API key not configured');
    }
    params.append('apikey', apiKey);
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    // Construct the full URL manually since Ticketmaster API expects params in URL
    const fullUrl = `${this.baseURL}/attractions.json?${params.toString()}`;
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Ticketmaster API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getAttraction(attractionId: string): Promise<any> {
    return this.makeRequest(
      `/attractions/${attractionId}.json`,
      {},
      `ticketmaster:attraction:${attractionId}`,
      3600
    );
  }
} 