import { env } from '~/env';

const SETLISTFM_BASE_URL = 'https://api.setlist.fm/rest/1.0';

// Rate limit: 10 requests per minute for setlist.fm
const requestQueue: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 10;
const MINUTE_IN_MS = 60000;

async function rateLimitSetlistFm() {
  const now = Date.now();
  
  // Remove requests older than 1 minute
  while (requestQueue.length > 0 && requestQueue[0]! < now - MINUTE_IN_MS) {
    requestQueue.shift();
  }
  
  // If we've hit the rate limit, wait
  if (requestQueue.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldestRequest = requestQueue[0]!;
    const waitTime = MINUTE_IN_MS - (now - oldestRequest) + 100; // Add 100ms buffer
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return rateLimitSetlistFm(); // Recursive call to recheck
  }
  
  requestQueue.push(now);
}

export async function fetchAllSetlists(mbid: string) {
  if (!env.SETLISTFM_API_KEY) {
    console.warn('SETLISTFM_API_KEY not configured, skipping setlist fetch');
    return [];
  }
  
  const setlists: any[] = [];
  let page = 1;
  let totalPages = 1;
  
  try {
    while (page <= totalPages && page <= 10) { // Limit to 10 pages max to avoid excessive API calls
      await rateLimitSetlistFm();
      
      const url = `${SETLISTFM_BASE_URL}/artist/${mbid}/setlists?p=${page}`;
      
      const response = await fetch(url, {
        headers: {
          'x-api-key': env.SETLISTFM_API_KEY,
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No setlists found for MBID: ${mbid}`);
          return [];
        }
        if (response.status === 429) {
          throw new Error('Setlist.fm rate limit exceeded');
        }
        throw new Error(`Setlist.fm API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.setlist && Array.isArray(data.setlist)) {
        setlists.push(...data.setlist);
      }
      
      // Update total pages from response
      if (data.total && data.itemsPerPage) {
        totalPages = Math.ceil(data.total / data.itemsPerPage);
      }
      
      page++;
    }
    
    console.log(`Fetched ${setlists.length} setlists for MBID: ${mbid}`);
    return setlists;
    
  } catch (error) {
    console.error('Failed to fetch setlists:', error);
    return setlists; // Return what we have so far
  }
}