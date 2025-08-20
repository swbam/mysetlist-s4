/**
 * Ticketmaster API Client
 * Implements GROK.md specifications for paginated event fetching with async generators
 */

import { env } from "../../env";
import { fetchJson } from "../util/http";

const TICKETMASTER_BASE_URL = "https://app.ticketmaster.com";

export interface TicketmasterEvent {
  id: string;
  name?: string;
  url?: string;
  dates?: {
    start?: {
      dateTime?: string;
      localDate?: string;
      localTime?: string;
    };
  };
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
    ratio?: string;
  }>;
  _embedded?: {
    venues?: Array<{
      id: string;
      name: string;
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
      location?: {
        longitude: string;
        latitude: string;
      };
      address?: {
        line1?: string;
        line2?: string;
      };
      postalCode?: string;
    }>;
    attractions?: Array<{
      id: string;
      name: string;
      url?: string;
    }>;
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
  }>;
  priceRanges?: Array<{
    type: string;
    currency: string;
    min: number;
    max: number;
  }>;
  status?: {
    code: string;
  };
}

export interface TicketmasterVenue {
  id: string;
  name: string;
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
  location?: {
    longitude: string;
    latitude: string;
  };
  address?: {
    line1?: string;
    line2?: string;
  };
  postalCode?: string;
  url?: string;
  timezone?: string;
}

export interface TicketmasterPage {
  size: number;
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface TicketmasterResponse {
  _embedded?: {
    events?: TicketmasterEvent[];
    venues?: TicketmasterVenue[];
    attractions?: Array<{
      id: string;
      name: string;
      url?: string;
      images?: Array<{
        url: string;
        width?: number;
        height?: number;
      }>;
      classifications?: Array<{
        segment?: { name: string };
        genre?: { name: string };
        subGenre?: { name: string };
      }>;
      externalLinks?: {
        spotify?: Array<{ url: string }>;
        lastfm?: Array<{ url: string }>;
        facebook?: Array<{ url: string }>;
        twitter?: Array<{ url: string }>;
        instagram?: Array<{ url: string }>;
      };
    }>;
  };
  page?: TicketmasterPage;
  _links?: {
    self?: {
      href: string;
    };
    next?: {
      href: string;
    };
    prev?: {
      href: string;
    };
  };
}

export interface TicketmasterError {
  error: string;
  error_description?: string;
  status: number;
}

/**
 * Get API key from environment with validation
 */
function getApiKey(): string {
  const apiKey = env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    throw new Error("TICKETMASTER_API_KEY environment variable is required");
  }
  return apiKey;
}

/**
 * Build URL with proper parameter encoding
 */
function buildUrl(
  endpoint: string,
  params: Record<string, string | number | boolean>,
): string {
  const url = new URL(`/discovery/v2${endpoint}`, TICKETMASTER_BASE_URL);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

/**
 * Paginated iterator for Ticketmaster events by attraction ID
 * Handles all pages using async generators as specified in GROK.md
 */
export async function* iterateEventsByAttraction(
  attractionId: string,
  apiKey?: string,
): AsyncGenerator<TicketmasterEvent[], void, unknown> {
  const key = apiKey || getApiKey();
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    try {
      const url = buildUrl("/events.json", {
        attractionId: attractionId,
        size: 200, // Maximum page size
        page: page,
        apikey: key,
        sort: "date,asc", // Sort by date ascending for consistent results
      });

      const data: TicketmasterResponse = await fetchJson(
        url,
        {},
        {
          tries: 3,
          baseDelay: 1000,
          retryOn: (response) =>
            response.status === 429 || response.status >= 500,
          timeout: 30000,
        },
      );

      // Update total pages from response
      if (data.page) {
        totalPages = data.page.totalPages || 1;
      }

      // Extract events from response
      const events = data._embedded?.events || [];

      // Log progress for debugging
      console.log(
        `Ticketmaster: Retrieved page ${page + 1}/${totalPages} with ${events.length} events for attraction ${attractionId}`,
      );

      yield events;
      page++;

      // Rate limiting: small delay between requests to be respectful
      if (page < totalPages) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error: any) {
      console.error(
        `Ticketmaster API error on page ${page} for attraction ${attractionId}:`,
        error,
      );

      // If it's a 404, the attraction might not exist or have no events
      if (error.status === 404) {
        console.warn(`No events found for attraction ${attractionId}`);
        return;
      }

      // If it's a client error (4xx), don't retry
      if (
        error.status &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 429
      ) {
        throw new Error(`Ticketmaster API client error: ${error.message}`);
      }

      // For other errors, re-throw to let the retry logic handle it
      throw error;
    }
  }
}

/**
 * Search for attractions (artists) by name
 */
export async function searchAttractions(
  keyword: string,
  options: {
    apiKey?: string;
    size?: number;
    page?: number;
    classificationName?: string;
    countryCode?: string;
  } = {},
): Promise<{
  attractions: Array<{
    id: string;
    name: string;
    url?: string;
    images?: Array<{
      url: string;
      width?: number;
      height?: number;
    }>;
    classifications?: Array<{
      segment?: { name: string };
      genre?: { name: string };
      subGenre?: { name: string };
    }>;
    externalLinks?: {
      spotify?: Array<{ url: string }>;
      lastfm?: Array<{ url: string }>;
      facebook?: Array<{ url: string }>;
      twitter?: Array<{ url: string }>;
      instagram?: Array<{ url: string }>;
    };
  }>;
  page?: TicketmasterPage;
}> {
  const {
    apiKey,
    size = 50,
    page = 0,
    classificationName = "Music",
    countryCode = "US",
  } = options;

  const key = apiKey || getApiKey();

  const url = buildUrl("/attractions.json", {
    keyword: keyword,
    size: size,
    page: page,
    apikey: key,
    classificationName: classificationName,
    countryCode: countryCode,
    sort: "relevance,desc",
  });

  try {
    const data: TicketmasterResponse = await fetchJson(
      url,
      {},
      {
        tries: 3,
        baseDelay: 500,
        retryOn: (response) =>
          response.status === 429 || response.status >= 500,
        timeout: 20000,
      },
    );

    return {
      attractions: data._embedded?.attractions || [],
      page: data.page,
    };
  } catch (error: any) {
    console.error("Ticketmaster attraction search error:", error);
    throw new Error(`Failed to search attractions: ${error.message}`);
  }
}

/**
 * Get attraction (artist) details by ID
 */
export async function getAttraction(
  attractionId: string,
  apiKey?: string,
): Promise<{
  id: string;
  name: string;
  url?: string;
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
  }>;
  classifications?: Array<{
    segment?: { name: string };
    genre?: { name: string };
    subGenre?: { name: string };
  }>;
  externalLinks?: {
    spotify?: Array<{ url: string }>;
    musicbrainz?: Array<{ id: string }>;
  };
} | null> {
  const key = apiKey || getApiKey();

  const url = buildUrl(
    `/attractions/${encodeURIComponent(attractionId)}.json`,
    {
      apikey: key,
    },
  );

  try {
    const attraction = await fetchJson(
      url,
      {},
      {
        tries: 3,
        baseDelay: 500,
        retryOn: (response) =>
          response.status === 429 || response.status >= 500,
        timeout: 15000,
      },
    );

    return attraction;
  } catch (error: any) {
    if (error.status === 404) {
      console.warn(`Attraction ${attractionId} not found`);
      return null;
    }

    console.error("Ticketmaster attraction fetch error:", error);
    throw new Error(`Failed to fetch attraction: ${error.message}`);
  }
}

/**
 * Get venue details by ID
 */
export async function getVenue(
  venueId: string,
  apiKey?: string,
): Promise<TicketmasterVenue | null> {
  const key = apiKey || getApiKey();

  const url = buildUrl(`/venues/${encodeURIComponent(venueId)}.json`, {
    apikey: key,
  });

  try {
    const venue: TicketmasterVenue = await fetchJson(
      url,
      {},
      {
        tries: 3,
        baseDelay: 500,
        retryOn: (response) =>
          response.status === 429 || response.status >= 500,
        timeout: 15000,
      },
    );

    return venue;
  } catch (error: any) {
    if (error.status === 404) {
      console.warn(`Venue ${venueId} not found`);
      return null;
    }

    console.error("Ticketmaster venue fetch error:", error);
    throw new Error(`Failed to fetch venue: ${error.message}`);
  }
}

/**
 * Get event details by ID
 */
export async function getEvent(
  eventId: string,
  apiKey?: string,
): Promise<TicketmasterEvent | null> {
  const key = apiKey || getApiKey();

  const url = buildUrl(`/events/${encodeURIComponent(eventId)}.json`, {
    apikey: key,
  });

  try {
    const event: TicketmasterEvent = await fetchJson(
      url,
      {},
      {
        tries: 3,
        baseDelay: 500,
        retryOn: (response) =>
          response.status === 429 || response.status >= 500,
        timeout: 15000,
      },
    );

    return event;
  } catch (error: any) {
    if (error.status === 404) {
      console.warn(`Event ${eventId} not found`);
      return null;
    }

    console.error("Ticketmaster event fetch error:", error);
    throw new Error(`Failed to fetch event: ${error.message}`);
  }
}

/**
 * Iterator for all events with optional filters
 */
export async function* iterateEvents(
  options: {
    apiKey?: string;
    size?: number;
    classificationName?: string;
    countryCode?: string;
    stateCode?: string;
    city?: string;
    startDateTime?: string;
    endDateTime?: string;
  } = {},
): AsyncGenerator<TicketmasterEvent[], void, unknown> {
  const {
    apiKey,
    size = 200,
    classificationName = "Music",
    countryCode = "US",
    stateCode,
    city,
    startDateTime,
    endDateTime,
  } = options;

  const key = apiKey || getApiKey();
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    try {
      const params: Record<string, string | number> = {
        size: size,
        page: page,
        apikey: key,
        classificationName: classificationName,
        countryCode: countryCode,
        sort: "date,asc",
      };

      if (stateCode) params.stateCode = stateCode;
      if (city) params.city = city;
      if (startDateTime) params.startDateTime = startDateTime;
      if (endDateTime) params.endDateTime = endDateTime;

      const url = buildUrl("/events.json", params);

      const data: TicketmasterResponse = await fetchJson(
        url,
        {},
        {
          tries: 3,
          baseDelay: 1000,
          retryOn: (response) =>
            response.status === 429 || response.status >= 500,
          timeout: 30000,
        },
      );

      if (data.page) {
        totalPages = data.page.totalPages || 1;
      }

      const events = data._embedded?.events || [];

      console.log(
        `Ticketmaster: Retrieved page ${page + 1}/${totalPages} with ${events.length} events`,
      );

      yield events;
      page++;

      // Rate limiting between requests
      if (page < totalPages) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (error: any) {
      console.error(`Ticketmaster API error on page ${page}:`, error);

      if (error.status === 404) {
        console.warn("No events found for the given criteria");
        return;
      }

      if (
        error.status &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 429
      ) {
        throw new Error(`Ticketmaster API client error: ${error.message}`);
      }

      throw error;
    }
  }
}

/**
 * Test API connectivity and rate limits
 */
export async function testApiConnection(apiKey?: string): Promise<{
  success: boolean;
  rateLimit?: {
    remaining: number;
    reset: number;
  };
  error?: string;
}> {
  const key = apiKey || getApiKey();

  try {
    const url = buildUrl("/events.json", {
      size: 1,
      page: 0,
      apikey: key,
      countryCode: "US",
    });

    const response = await fetchJson(
      url,
      {},
      {
        tries: 1, // Only try once for connectivity test
        timeout: 10000,
      },
    );

    return {
      success: true,
      rateLimit: {
        remaining: Number.parseInt(
          response.headers?.["x-ratelimit-remaining"] || "0",
        ),
        reset: Number.parseInt(response.headers?.["x-ratelimit-reset"] || "0"),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
