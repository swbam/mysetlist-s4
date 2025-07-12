import { env } from '~/env';

const TICKETMASTER_BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

// Simple rate limiter to respect 5 req/sec limit
let lastRequest = 0;
const MIN_REQUEST_INTERVAL = 200; // 200ms = 5 requests per second

async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequest;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  
  lastRequest = Date.now();
}

export async function fetchAttraction(tmId: string) {
  await rateLimit();
  
  const url = `${TICKETMASTER_BASE_URL}/attractions/${tmId}?apikey=${env["TICKETMASTER_API_KEY"]}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Attraction not found: ${tmId}`);
    }
    if (response.status === 429) {
      throw new Error('Ticketmaster rate limit exceeded');
    }
    throw new Error(`Ticketmaster API error: ${response.status}`);
  }
  
  return response.json();
}

export async function fetchAttractionEvents(tmId: string, options: {
  size?: number;
  page?: number;
  includePast?: boolean;
} = {}) {
  await rateLimit();
  
  const url = new URL(`${TICKETMASTER_BASE_URL}/events`);
  url.searchParams.append('apikey', env["TICKETMASTER_API_KEY"]);
  url.searchParams.append('attractionId', tmId);
  url.searchParams.append('size', (options.size || 200).toString());
  url.searchParams.append('page', (options.page || 0).toString());
  
  if (!options.includePast) {
    // Only get upcoming events by default
    url.searchParams.append('startDateTime', new Date().toISOString());
  }
  
  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Ticketmaster rate limit exceeded');
    }
    throw new Error(`Ticketmaster API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
}