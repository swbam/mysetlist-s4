import { Redis } from '@upstash/redis';
import { unstable_cache } from 'next/cache';

// Redis client for server-side caching
let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// Cache strategies with different TTL values
export const CACHE_STRATEGIES = {
  // Static content - cache for 1 year with revalidation
  STATIC: 'public, max-age=31536000, immutable',
  
  // API responses - cache for 5 minutes
  API_SHORT: 'public, max-age=300, stale-while-revalidate=3600',
  
  // Artist/venue data - cache for 1 hour
  CONTENT_MEDIUM: 'public, max-age=3600, stale-while-revalidate=86400',
  
  // Search results - cache for 10 minutes
  SEARCH: 'public, max-age=600, stale-while-revalidate=1800',
  
  // User-specific content - no cache
  PRIVATE: 'private, no-cache, no-store, must-revalidate',
  
  // Real-time data - minimal cache
  REALTIME: 'public, max-age=60, stale-while-revalidate=300',
} as const;

// Cache durations in seconds
export const CACHE_DURATIONS = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
  WEEK: 604800, // 7 days
} as const;

// Cache tags for selective invalidation
export const CACHE_TAGS = {
  ARTISTS: 'artists',
  SHOWS: 'shows',
  VENUES: 'venues',
  SETLISTS: 'setlists',
  SEARCH: 'search',
  TRENDING: 'trending',
  USER_DATA: 'user-data',
  ANALYTICS: 'analytics',
} as const;

interface CacheOptions {
  ttl?: number;
  tags?: string[];
  namespace?: string;
}

/**
 * Multi-layer caching service using Redis and Next.js cache
 */
export class CacheService {
  private static getKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  /**
   * Set cache with Redis fallback to memory
   */
  static async set(
    key: string, 
    value: any, 
    options: CacheOptions = {}
  ): Promise<void> {
    const { ttl = CACHE_DURATIONS.MEDIUM, namespace } = options;
    const cacheKey = this.getKey(key, namespace);

    try {
      if (redis) {
        await redis.setex(cacheKey, ttl, JSON.stringify(value));
      } else {
        // Fallback to in-memory cache for development
        const memCache = globalThis.__cache || new Map();
        globalThis.__cache = memCache;
        memCache.set(cacheKey, { value, expiry: Date.now() + ttl * 1000 });
      }
    } catch (error) {
      console.warn('Cache set failed:', error);
    }
  }

  /**
   * Get from cache with Redis fallback to memory
   */
  static async get<T = any>(
    key: string, 
    options: Pick<CacheOptions, 'namespace'> = {}
  ): Promise<T | null> {
    const { namespace } = options;
    const cacheKey = this.getKey(key, namespace);

    try {
      if (redis) {
        const result = await redis.get(cacheKey);
        return result ? JSON.parse(result as string) : null;
      } else {
        // Fallback to in-memory cache
        const memCache = globalThis.__cache;
        if (memCache?.has(cacheKey)) {
          const cached = memCache.get(cacheKey);
          if (cached.expiry > Date.now()) {
            return cached.value;
          } else {
            memCache.delete(cacheKey);
          }
        }
      }
    } catch (error) {
      console.warn('Cache get failed:', error);
    }

    return null;
  }

  /**
   * Delete from cache
   */
  static async delete(
    key: string, 
    options: Pick<CacheOptions, 'namespace'> = {}
  ): Promise<void> {
    const { namespace } = options;
    const cacheKey = this.getKey(key, namespace);

    try {
      if (redis) {
        await redis.del(cacheKey);
      } else {
        const memCache = globalThis.__cache;
        memCache?.delete(cacheKey);
      }
    } catch (error) {
      console.warn('Cache delete failed:', error);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  static async invalidatePattern(
    pattern: string, 
    namespace?: string
  ): Promise<void> {
    try {
      if (redis) {
        const searchPattern = namespace ? `${namespace}:${pattern}` : pattern;
        const keys = await redis.keys(searchPattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } else {
        const memCache = globalThis.__cache;
        if (memCache) {
          const keysToDelete: string[] = [];
          for (const key of memCache.keys()) {
            const searchPattern = namespace ? `${namespace}:${pattern}` : pattern;
            if (key.includes(searchPattern.replace('*', ''))) {
              keysToDelete.push(key);
            }
          }
          keysToDelete.forEach(key => memCache.delete(key));
        }
      }
    } catch (error) {
      console.warn('Cache pattern invalidation failed:', error);
    }
  }

  /**
   * Cache wrapper function with automatic key generation
   */
  static async wrap<T>(
    keyOrFn: string | ((...args: any[]) => string),
    fn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const key = typeof keyOrFn === 'function' ? keyOrFn() : keyOrFn;
    
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, options);
    
    return result;
  }
}

/**
 * Create a cached function using Next.js unstable_cache with Redis fallback
 */
export function createCachedFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyPrefix: string,
  duration: number = CACHE_DURATIONS.MEDIUM,
  tags: string[] = []
) {
  // Use Next.js cache for server-side rendering
  const nextCached = unstable_cache(
    fn,
    [keyPrefix],
    {
      revalidate: duration,
      tags,
    }
  );

  // Wrapper with additional Redis caching
  return async (...args: T): Promise<R> => {
    const argsKey = JSON.stringify(args);
    const cacheKey = `${keyPrefix}:${argsKey}`;

    try {
      // Try Redis cache first
      const cached = await CacheService.get<R>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Fall back to Next.js cache
      const result = await nextCached(...args);
      
      // Cache in Redis for future requests
      await CacheService.set(cacheKey, result, { ttl: duration });
      
      return result;
    } catch (error) {
      console.warn('Cached function failed, executing directly:', error);
      return fn(...args);
    }
  };
}

/**
 * Set cache control headers on responses
 */
export function setCacheHeaders(
  response: Response,
  strategy: keyof typeof CACHE_STRATEGIES
): Response {
  response.headers.set('Cache-Control', CACHE_STRATEGIES[strategy]);
  
  // Add ETag for better cache validation
  if (!response.headers.has('ETag')) {
    const etag = `"${Date.now().toString(36)}"`;
    response.headers.set('ETag', etag);
  }
  
  return response;
}

/**
 * Cache invalidation helpers
 */
export class CacheInvalidator {
  static async invalidateArtist(artistId: string): Promise<void> {
    await Promise.all([
      CacheService.invalidatePattern(`artist:${artistId}*`),
      CacheService.invalidatePattern(`shows:artist:${artistId}*`),
      CacheService.invalidatePattern(`search:*${artistId}*`),
    ]);
  }

  static async invalidateShow(showId: string): Promise<void> {
    await Promise.all([
      CacheService.invalidatePattern(`show:${showId}*`),
      CacheService.invalidatePattern(`setlist:${showId}*`),
      CacheService.invalidatePattern(`trending:*`),
    ]);
  }

  static async invalidateSearch(): Promise<void> {
    await CacheService.invalidatePattern('search:*');
  }

  static async invalidateUser(userId: string): Promise<void> {
    await CacheService.invalidatePattern(`user:${userId}*`);
  }
}

// Cache warming for critical data
export class CacheWarmer {
  static async warmTrendingData(): Promise<void> {
    try {
      // Warm trending artists, shows, venues
      const trendingQueries = [
        'trending:artists',
        'trending:shows',
        'trending:venues',
      ];

      await Promise.all(
        trendingQueries.map(async (key) => {
          const cached = await CacheService.get(key);
          if (!cached) {
            // Execute the trending query and cache it
            // This would be implemented based on your trending logic
            console.log(`Warming cache for ${key}`);
          }
        })
      );
    } catch (error) {
      console.warn('Cache warming failed:', error);
    }
  }

  static async warmPopularSearches(): Promise<void> {
    // Warm cache for popular search terms
    const popularTerms = [
      'taylor swift',
      'coldplay',
      'ed sheeran',
      'billie eilish',
      'the weeknd',
    ];

    await Promise.all(
      popularTerms.map(async (term) => {
        const key = `search:${term}`;
        const cached = await CacheService.get(key);
        if (!cached) {
          console.log(`Warming search cache for ${term}`);
          // Execute search and cache result
        }
      })
    );
  }
}

declare global {
  var __cache: Map<string, { value: any; expiry: number }> | undefined;
}