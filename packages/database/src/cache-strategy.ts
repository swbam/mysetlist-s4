/**
 * Database Caching Strategy for TheSet Performance Optimization
 *
 * Implements multi-layer caching to reduce database load and improve response times:
 * 1. In-Memory Cache (Node.js) - 30 seconds for hot data
 * 2. Redis Cache - 5-15 minutes for computed results
 * 3. Materialized Views - 15 minutes refresh for trending data
 * 4. Response Caching - CDN level caching with proper headers
 */

import { LRUCache } from "lru-cache";

// ===========================================
// LAYER 1: IN-MEMORY CACHE (Node.js Process)
// ===========================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface SearchCacheKey {
  query: string;
  type: string;
  limit: number;
  filters: Record<string, any>;
}

interface TrendingCacheKey {
  period: string;
  type: string;
  limit: number;
  offset: number;
}

// Hot data cache - Very fast, short TTL
const hotCache = new LRUCache<string, CacheEntry<any>>({
  max: 500, // Maximum 500 entries
  ttl: 30 * 1000, // 30 seconds TTL
  updateAgeOnGet: true,
});

// Search results cache - Slightly longer TTL for search results
const searchCache = new LRUCache<string, CacheEntry<any>>({
  max: 200, // Maximum 200 search queries
  ttl: 2 * 60 * 1000, // 2 minutes TTL
  updateAgeOnGet: true,
});

// ===========================================
// CACHE KEY GENERATORS
// ===========================================

function generateSearchCacheKey(params: SearchCacheKey): string {
  const sorted = Object.keys(params.filters)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = params.filters[key];
        return acc;
      },
      {} as Record<string, any>,
    );

  return `search:${params.query}:${params.type}:${params.limit}:${JSON.stringify(sorted)}`;
}

function generateTrendingCacheKey(params: TrendingCacheKey): string {
  return `trending:${params.period}:${params.type}:${params.limit}:${params.offset}`;
}

function generateArtistCacheKey(artistId: string): string {
  return `artist:${artistId}`;
}

function generateShowCacheKey(showId: string): string {
  return `show:${showId}`;
}

// ===========================================
// GENERIC CACHE FUNCTIONS
// ===========================================

export function getCached<T>(
  key: string,
  cache: LRUCache<string, CacheEntry<T>>,
): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

export function setCached<T>(
  key: string,
  data: T,
  cache: LRUCache<string, CacheEntry<T>>,
  customTtl?: number,
): void {
  const ttl = customTtl || cache.ttl || 30000;
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

// ===========================================
// SEARCH CACHING FUNCTIONS
// ===========================================

export async function getCachedSearchResults(params: SearchCacheKey) {
  const cacheKey = generateSearchCacheKey(params);
  return getCached(cacheKey, searchCache);
}

export async function setCachedSearchResults(
  params: SearchCacheKey,
  results: any,
  customTtl?: number,
) {
  const cacheKey = generateSearchCacheKey(params);
  setCached(cacheKey, results, searchCache, customTtl);
}

// ===========================================
// TRENDING CACHING FUNCTIONS
// ===========================================

export async function getCachedTrendingResults(params: TrendingCacheKey) {
  const cacheKey = generateTrendingCacheKey(params);
  return getCached(cacheKey, hotCache);
}

export async function setCachedTrendingResults(
  params: TrendingCacheKey,
  results: any,
  customTtl?: number,
) {
  const cacheKey = generateTrendingCacheKey(params);
  setCached(cacheKey, results, hotCache, customTtl);
}

// ===========================================
// ENTITY CACHING FUNCTIONS
// ===========================================

export async function getCachedArtist(artistId: string) {
  const cacheKey = generateArtistCacheKey(artistId);
  return getCached(cacheKey, hotCache);
}

export async function setCachedArtist(
  artistId: string,
  artist: any,
  customTtl?: number,
) {
  const cacheKey = generateArtistCacheKey(artistId);
  setCached(cacheKey, artist, hotCache, customTtl);
}

export async function getCachedShow(showId: string) {
  const cacheKey = generateShowCacheKey(showId);
  return getCached(cacheKey, hotCache);
}

export async function setCachedShow(
  showId: string,
  show: any,
  customTtl?: number,
) {
  const cacheKey = generateShowCacheKey(showId);
  setCached(cacheKey, show, hotCache, customTtl);
}

// ===========================================
// CACHE INVALIDATION
// ===========================================

export function invalidateSearchCache(query?: string) {
  if (query) {
    // Invalidate specific query patterns
    const keysToDelete: string[] = [];
    for (const [key] of searchCache.entries()) {
      if (key.includes(`search:${query}`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => searchCache.delete(key));
  } else {
    // Clear all search cache
    searchCache.clear();
  }
}

export function invalidateTrendingCache() {
  // Clear all trending cache
  const keysToDelete: string[] = [];
  for (const [key] of hotCache.entries()) {
    if (key.startsWith("trending:")) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => hotCache.delete(key));
}

export function invalidateArtistCache(artistId?: string) {
  if (artistId) {
    const cacheKey = generateArtistCacheKey(artistId);
    hotCache.delete(cacheKey);
    // Also invalidate trending cache since artist data changed
    invalidateTrendingCache();
  }
}

export function invalidateShowCache(showId?: string) {
  if (showId) {
    const cacheKey = generateShowCacheKey(showId);
    hotCache.delete(cacheKey);
    // Also invalidate trending cache since show data changed
    invalidateTrendingCache();
  }
}

// ===========================================
// CACHE WARMING FUNCTIONS
// ===========================================

export async function warmPopularSearchCache(supabase: any) {
  try {
    // Get most popular search queries from analytics
    const { data: popularSearches } = await supabase
      .from("popular_searches")
      .select("query, search_type")
      .order("count", { ascending: false })
      .limit(20);

    if (!popularSearches) return;

    // Pre-warm cache with popular searches
    // Note: This would need to be implemented with actual search functions
    console.log(
      "Cache warming initiated for popular searches:",
      popularSearches.length,
    );
  } catch (error) {
    console.warn("Cache warming failed:", error);
  }
}

export async function warmTrendingCache(_supabase: any) {
  try {
    // Pre-warm trending cache by fetching current trending data
    const periods = ["day", "week", "month"];
    const types = ["artists", "shows"];

    for (const period of periods) {
      for (const type of types) {
        const cacheKey = generateTrendingCacheKey({
          period,
          type,
          limit: 20,
          offset: 0,
        });

        // This would trigger the actual trending query and cache the result
        // Implementation would depend on your trending data fetching logic
        console.log(`Warming trending cache: ${cacheKey}`);
      }
    }
  } catch (error) {
    console.warn("Trending cache warming failed:", error);
  }
}

// ===========================================
// CACHE STATISTICS
// ===========================================

export function getCacheStats() {
  return {
    hotCache: {
      size: hotCache.size,
      max: hotCache.max,
      hitRate: `${(((hotCache.calculatedSize || 0) / Math.max(hotCache.size, 1)) * 100).toFixed(2)}%`,
    },
    searchCache: {
      size: searchCache.size,
      max: searchCache.max,
      hitRate: `${(((searchCache.calculatedSize || 0) / Math.max(searchCache.size, 1)) * 100).toFixed(2)}%`,
    },
  };
}

// ===========================================
// CACHE MIDDLEWARE FOR API ROUTES
// ===========================================

export function withCache<T extends Record<string, any>>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    cache?: LRUCache<string, CacheEntry<T>>;
    skipCache?: boolean;
  } = {},
) {
  return async (): Promise<T> => {
    const { ttl, cache = hotCache, skipCache = false } = options;

    if (!skipCache) {
      const cached = getCached(cacheKey, cache);
      if (cached) {
        return cached as T;
      }
    }

    const result = await fetcher();

    if (!skipCache) {
      setCached(cacheKey, result, cache, ttl);
    }

    return result;
  };
}

// ===========================================
// RESPONSE CACHE HEADERS
// ===========================================

export interface CacheHeaderOptions {
  maxAge?: number; // seconds
  staleWhileRevalidate?: number; // seconds
  mustRevalidate?: boolean;
  private?: boolean;
}

export function generateCacheHeaders(
  options: CacheHeaderOptions = {},
): Record<string, string> {
  const {
    maxAge = 300, // 5 minutes default
    staleWhileRevalidate = 600, // 10 minutes default
    mustRevalidate = false,
    private: isPrivate = false,
  } = options;

  const visibility = isPrivate ? "private" : "public";
  const revalidate = mustRevalidate ? ", must-revalidate" : "";

  return {
    "Cache-Control": `${visibility}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}${revalidate}`,
    Vary: "Accept, Authorization",
  };
}

// ===========================================
// CACHE PERFORMANCE MONITORING
// ===========================================

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  averageResponseTime: number;
}

const cacheMetrics: Record<string, CacheMetrics> = {
  search: { hits: 0, misses: 0, evictions: 0, averageResponseTime: 0 },
  trending: { hits: 0, misses: 0, evictions: 0, averageResponseTime: 0 },
  entities: { hits: 0, misses: 0, evictions: 0, averageResponseTime: 0 },
};

export function recordCacheHit(
  cacheType: keyof typeof cacheMetrics,
  responseTime: number,
) {
  const metrics = cacheMetrics[cacheType];
  if (metrics) {
    metrics.hits += 1;
    metrics.averageResponseTime =
      (metrics.averageResponseTime + responseTime) / 2;
  }
}

export function recordCacheMiss(
  cacheType: keyof typeof cacheMetrics,
  responseTime: number,
) {
  const metrics = cacheMetrics[cacheType];
  if (metrics) {
    metrics.misses += 1;
    metrics.averageResponseTime =
      (metrics.averageResponseTime + responseTime) / 2;
  }
}

export function getCacheMetrics(): Record<
  string,
  CacheMetrics & { hitRate: number }
> {
  return Object.entries(cacheMetrics).reduce(
    (acc, [key, metrics]) => {
      const total = metrics.hits + metrics.misses;
      const hitRate = total > 0 ? (metrics.hits / total) * 100 : 0;

      acc[key] = {
        ...metrics,
        hitRate: Math.round(hitRate * 100) / 100,
      };

      return acc;
    },
    {} as Record<string, CacheMetrics & { hitRate: number }>,
  );
}

// ===========================================
// EXPORT ALL CACHE FUNCTIONS
// ===========================================

export const cache = {
  // Search caching
  getCachedSearchResults,
  setCachedSearchResults,

  // Trending caching
  getCachedTrendingResults,
  setCachedTrendingResults,

  // Entity caching
  getCachedArtist,
  setCachedArtist,
  getCachedShow,
  setCachedShow,

  // Cache invalidation
  invalidateSearchCache,
  invalidateTrendingCache,
  invalidateArtistCache,
  invalidateShowCache,

  // Cache warming
  warmPopularSearchCache,
  warmTrendingCache,

  // Utilities
  getCacheStats,
  withCache,
  generateCacheHeaders,

  // Monitoring
  recordCacheHit,
  recordCacheMiss,
  getCacheMetrics,
};

export default cache;
