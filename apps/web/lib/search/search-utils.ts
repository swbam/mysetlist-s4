/**
 * Search utilities implementing GROK.md Section 13 specifications
 * Provides typeahead functionality with optional pre-warming
 */

export interface SearchResult {
  id: string;
  type: "artist";
  name: string;
  imageUrl?: string;
  description?: string;
  metadata?: {
    slug?: string;
    popularity?: number;
    genres?: string[];
    source: "ticketmaster";
    externalId: string;
  };
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalCount: number;
  timestamp: string;
  error?: string;
}

/**
 * Idempotent search function - GET /api/search
 * No side effects, safe for typeahead
 */
export async function searchArtists(
  query: string,
  options: {
    limit?: number;
    signal?: AbortSignal;
  } = {}
): Promise<SearchResponse> {
  const { limit = 10, signal } = options;

  if (!query || query.length < 2) {
    return {
      query,
      results: [],
      totalCount: 0,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    const response = await fetch(`/api/search?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error; // Re-throw abort errors
    }
    
    console.error("Search failed:", error);
    return {
      query,
      results: [],
      totalCount: 0,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Search failed",
    };
  }
}

/**
 * Pre-warm artist import - POST /api/artists/import
 * Optional optimization for better UX on hover/focus
 */
export async function preWarmArtist(
  tmAttractionId: string,
  options: {
    signal?: AbortSignal;
    silent?: boolean;
  } = {}
): Promise<{ success: boolean; artistId?: string; slug?: string; error?: string }> {
  const { signal, silent = true } = options;

  try {
    const response = await fetch("/api/artists/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tmAttractionId,
      }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Import failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      artistId: data.artistId,
      slug: data.slug,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error; // Re-throw abort errors
    }

    const errorMessage = error instanceof Error ? error.message : "Pre-warm failed";
    
    if (!silent) {
      console.error("Pre-warm failed:", error);
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Generate artist URL from search result
 */
export function getArtistUrl(result: SearchResult): string {
  const slug =
    result.metadata?.slug ||
    result.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  
  return `/artists/${slug}`;
}

/**
 * Debounce function for search queries
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
}

/**
 * Search result sorting and relevance scoring
 */
export function sortSearchResults(results: SearchResult[], query: string): SearchResult[] {
  const queryLower = query.toLowerCase();
  
  return results.sort((a, b) => {
    const aNameLower = a.name.toLowerCase();
    const bNameLower = b.name.toLowerCase();

    // Exact matches first
    const aExact = aNameLower === queryLower ? 1 : 0;
    const bExact = bNameLower === queryLower ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;

    // Then starts-with matches
    const aStartsWith = aNameLower.startsWith(queryLower) ? 1 : 0;
    const bStartsWith = bNameLower.startsWith(queryLower) ? 1 : 0;
    if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;

    // Then by popularity if available
    const aPopularity = a.metadata?.popularity || 0;
    const bPopularity = b.metadata?.popularity || 0;
    if (aPopularity !== bPopularity) return bPopularity - aPopularity;

    // Finally alphabetical order
    return a.name.localeCompare(b.name);
  });
}

/**
 * Cache for search results to reduce API calls
 */
class SearchCache {
  private cache = new Map<string, { data: SearchResponse; timestamp: number }>();
  private ttl = 60000; // 1 minute
  private maxSize = 100;

  get(key: string): SearchResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: SearchResponse): void {
    // Clean up old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldest = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
      
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const searchCache = new SearchCache();

/**
 * Cached search function
 */
export async function searchArtistsCached(
  query: string,
  options: {
    limit?: number;
    signal?: AbortSignal;
    bypassCache?: boolean;
  } = {}
): Promise<SearchResponse> {
  const { limit = 10, signal, bypassCache = false } = options;
  
  const cacheKey = `${query}:${limit}`;
  
  // Check cache first (unless bypassed)
  if (!bypassCache) {
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  // Perform search
  const result = await searchArtists(query, { limit, signal });
  
  // Cache successful results
  if (!result.error && result.results.length > 0) {
    searchCache.set(cacheKey, result);
  }
  
  return result;
}

/**
 * Validate search query
 */
export function isValidSearchQuery(query: string): boolean {
  return query.trim().length >= 2;
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  return query.trim().slice(0, 100); // Limit length
}

/**
 * Extract artist name for URL generation
 */
export function generateArtistSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}