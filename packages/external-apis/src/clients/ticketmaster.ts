import { type APIClientConfig, BaseAPIClient } from "./base"

export interface TicketmasterEvent {
  id: string
  name: string
  type: string
  url: string
  locale: string
  images?: Array<{
    url: string
    width: number
    height: number
    ratio?: string
  }>
  dates: {
    start: {
      localDate: string
      localTime?: string
      dateTime?: string
    }
    status: {
      code: string
    }
  }
  priceRanges?: Array<{
    type: string
    currency: string
    min: number
    max: number
  }>
  _embedded?: {
    venues?: TicketmasterVenue[]
    attractions?: Array<{
      id: string
      name: string
      type: string
      url: string
    }>
  }
}

export interface TicketmasterVenue {
  id: string
  name: string
  type: string
  url: string
  locale: string
  timezone?: string
  city?: {
    name: string
  }
  state?: {
    name: string
    stateCode: string
  }
  country?: {
    name: string
    countryCode: string
  }
  address?: {
    line1: string
    line2?: string
  }
  location?: {
    longitude: string
    latitude: string
  }
  postalCode?: string
  generalInfo?: {
    generalRule?: string
    childRule?: string
  }
  capacity?: number
  images?: Array<{
    url: string
    width: number
    height: number
    ratio?: string
  }>
}

export class TicketmasterClient extends BaseAPIClient {
  constructor(config: Omit<APIClientConfig, "baseURL">) {
    const apiKey = process.env["TICKETMASTER_API_KEY"]
    if (!apiKey) {
      throw new Error("Ticketmaster API key not configured")
    }

    super({
      ...config,
      baseURL: "https://app.ticketmaster.com/discovery/v2/",
      apiKey,
      rateLimit: { requests: 5000, window: 24 * 3600 }, // 5000 requests per day
      cache: { defaultTTL: 1800 }, // 30 minutes default cache
    })
  }

  protected getAuthHeaders(): Record<string, string> {
    // Ticketmaster uses API key in URL params, not headers
    return {}
  }

  protected override async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string,
    cacheTtl?: number
  ): Promise<T> {
    // Add API key to URL params for Ticketmaster
    const url = new URL(endpoint, this.baseURL)
    url.searchParams.append("apikey", this.apiKey!)

    // Check cache first if key provided and cache is available
    if (cacheKey && this.cache) {
      try {
        const cached = await this.cache.get(cacheKey)
        if (cached) {
          return JSON.parse(cached as string) as T
        }
      } catch (_error) {
        // Cache miss or error, continue with API call
      }
    }

    // Check rate limits
    if (this.rateLimit) {
      await this.checkRateLimit()
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(
        `Ticketmaster API request failed: ${response.status} ${response.statusText}`
      )
    }

    const data = (await response.json()) as T

    // Cache if key provided and cache is available
    if (cacheKey && cacheTtl && this.cache) {
      try {
        await this.cache.setex(cacheKey, cacheTtl, JSON.stringify(data))
      } catch (_error) {}
    }

    return data
  }

  async searchEvents(options: {
    keyword?: string
    city?: string
    stateCode?: string
    countryCode?: string
    radius?: number
    startDateTime?: string
    endDateTime?: string
    size?: number
    page?: number
    classificationName?: string
    sort?: string
  }): Promise<{ _embedded?: { events: TicketmasterEvent[] }; page: any }> {
    const params = new URLSearchParams()

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString())
      }
    })

    return this.makeRequest(
      `events.json?${params.toString()}`,
      {},
      `ticketmaster:events:${params.toString()}`,
      900 // 15 minutes cache
    )
  }

  async getEvent(eventId: string): Promise<TicketmasterEvent> {
    return this.makeRequest<TicketmasterEvent>(
      `events/${eventId}.json`,
      {},
      `ticketmaster:event:${eventId}`,
      1800
    )
  }

  async searchVenues(options: {
    keyword?: string
    city?: string
    stateCode?: string
    countryCode?: string
    size?: number
    page?: number
    sort?: string
  }): Promise<{ _embedded?: { venues: TicketmasterVenue[] }; page: any }> {
    const params = new URLSearchParams()

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString())
      }
    })

    return this.makeRequest(
      `venues.json?${params}`,
      {},
      `ticketmaster:venues:${params.toString()}`,
      3600
    )
  }

  async getVenue(venueId: string): Promise<TicketmasterVenue> {
    return this.makeRequest<TicketmasterVenue>(
      `venues/${venueId}.json`,
      {},
      `ticketmaster:venue:${venueId}`,
      3600
    )
  }

  async searchAttractions(options: {
    keyword?: string
    size?: number
    page?: number
    sort?: string
    classificationName?: string
  }): Promise<{ _embedded?: { attractions: any[] }; page: any }> {
    const params = new URLSearchParams()

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString())
      }
    })

    return this.makeRequest(
      `attractions.json?${params.toString()}`,
      {},
      `ticketmaster:attractions:${params.toString()}`,
      1800
    )
  }

  async getAttraction(attractionId: string): Promise<any> {
    return this.makeRequest(
      `attractions/${attractionId}.json`,
      {},
      `ticketmaster:attraction:${attractionId}`,
      3600
    )
  }

  async getUpcomingEvents(
    artistName: string,
    options: {
      size?: number
      sort?: string
      startDateTime?: string
      endDateTime?: string
    } = {}
  ): Promise<TicketmasterEvent[]> {
    const result = await this.searchEvents({
      keyword: artistName,
      classificationName: "Music",
      ...options,
    })

    return result._embedded?.events || []
  }
}
