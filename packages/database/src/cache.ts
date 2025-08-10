import { LRUCache } from "lru-cache";

// Types for cache configuration
interface CacheConfig {
  max: number;
  ttl: number;
  updateAgeOnGet?: boolean;
  updateAgeOnHas?: boolean;
  stale?: boolean;
}

// Different cache configurations for different query types
const cacheConfigs: Record<string, CacheConfig> = {
  // Long-lived caches for relatively static data
  artists: {
    max: 1000,
    ttl: 1000 * 60 * 60, // 1 hour
    updateAgeOnGet: true,
    stale: true,
  },
  venues: {
    max: 1000,
    ttl: 1000 * 60 * 60 * 24, // 24 hours
    updateAgeOnGet: true,
    stale: true,
  },
  // Medium-lived caches for semi-dynamic data
  shows: {
    max: 500,
    ttl: 1000 * 60 * 30, // 30 minutes
    updateAgeOnGet: true,
    stale: true,
  },
  setlists: {
    max: 500,
    ttl: 1000 * 60 * 15, // 15 minutes
    updateAgeOnGet: true,
    stale: true,
  },
  // Short-lived caches for dynamic data
  votes: {
    max: 100,
    ttl: 1000 * 60 * 5, // 5 minutes
    stale: false,
  },
  trending: {
    max: 50,
    ttl: 1000 * 60 * 10, // 10 minutes
    stale: false,
  },
  // Default cache for unspecified queries
  default: {
    max: 200,
    ttl: 1000 * 60 * 5, // 5 minutes
    stale: false,
  },
};

// Create cache instances
const caches = new Map<string, LRUCache<string, any>>();

// Get or create a cache instance for a specific type
function getCache(type: string): LRUCache<string, any> {
  if (!caches.has(type)) {
    const config = cacheConfigs[type] || cacheConfigs.default;
    if (config) {
      caches.set(type, new LRUCache(config));
    } else {
      throw new Error(`No cache config found for type: ${type}`);
    }
  }
  return caches.get(type)!;
}

// Generate a cache key from query parameters
function generateCacheKey(
  queryType: string,
  params: Record<string, any>,
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = params[key];
        return acc;
      },
      {} as Record<string, any>,
    );

  return `${queryType}:${JSON.stringify(sortedParams)}`;
}

// Cache wrapper for database queries
export async function withCache<T>(
  queryType: string,
  params: Record<string, any>,
  queryFn: () => Promise<T>,
  options?: {
    ttl?: number;
    force?: boolean;
  },
): Promise<T> {
  const cache = getCache(queryType);
  const cacheKey = generateCacheKey(queryType, params);

  // Check cache first unless force refresh is requested
  if (!options?.force) {
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      // Track cache hit for monitoring
      if (process.env.NODE_ENV === "development") {
      }
      return cached;
    }
  }

  // Execute query
  try {
    const result = await queryFn();

    // Store in cache with custom TTL if provided
    if (options?.ttl) {
      cache.set(cacheKey, result, { ttl: options.ttl });
    } else {
      cache.set(cacheKey, result);
    }

    // Track cache miss for monitoring
    if (process.env.NODE_ENV === "development") {
    }

    return result;
  } catch (error) {
    // On error, try to return stale data if available
    const staleData = cache.get(cacheKey, { allowStale: true });
    if (staleData !== undefined) {
      return staleData;
    }
    throw error;
  }
}

// Invalidate cache entries
export function invalidateCache(
  queryType?: string,
  params?: Record<string, any>,
) {
  if (!queryType) {
    // Clear all caches
    caches.forEach((cache) => cache.clear());
    return;
  }

  const cache = getCache(queryType);

  if (!params) {
    // Clear entire cache for this query type
    cache.clear();
    return;
  }

  // Clear specific cache entry
  const cacheKey = generateCacheKey(queryType, params);
  cache.delete(cacheKey);
}

// Batch invalidation for related cache entries
export function invalidateRelated(patterns: string[]) {
  caches.forEach((cache, type) => {
    if (patterns.some((pattern) => type.includes(pattern))) {
      cache.clear();
    }
  });
}

// Get cache statistics for monitoring
export function getCacheStats() {
  const stats: Record<string, any> = {};

  caches.forEach((cache, type) => {
    stats[type] = {
      size: cache.size,
      calculatedSize: cache.calculatedSize,
      hits: cache.size > 0 ? "tracking-enabled" : 0,
      misses: cache.size > 0 ? "tracking-enabled" : 0,
    };
  });

  return stats;
}

// Warm up cache with common queries
export async function warmCache(
  queries: Array<{
    type: string;
    params: Record<string, any>;
    fn: () => Promise<any>;
  }>,
) {
  const results = await Promise.allSettled(
    queries.map(({ type, params, fn }) => withCache(type, params, fn)),
  );

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return { successful, failed, total: queries.length };
}

// Export cache types for use in queries
export const CacheTypes = {
  ARTISTS: "artists",
  VENUES: "venues",
  SHOWS: "shows",
  SETLISTS: "setlists",
  VOTES: "votes",
  TRENDING: "trending",
  SEARCH: "search",
  USER: "user",
} as const;

export type CacheType = (typeof CacheTypes)[keyof typeof CacheTypes];
