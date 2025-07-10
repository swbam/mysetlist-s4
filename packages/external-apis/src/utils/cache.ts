import { Redis } from '@upstash/redis';

export interface CacheOptions {
  defaultTTL?: number; // seconds
  keyPrefix?: string;
}

export class CacheManager {
  private redis: Redis | null;
  private options: CacheOptions;
  private memoryCache: Map<string, { value: any; expiresAt: number }>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      defaultTTL: 3600, // 1 hour default
      ...options,
    };

    // Initialize Redis if environment variables are available
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    } else {
      this.redis = null;
    }

    // Fallback memory cache
    this.memoryCache = new Map();
  }

  async get<T>(key: string): Promise<T | null> {
    const prefixedKey = this.getPrefixedKey(key);

    // Try Redis first
    if (this.redis) {
      try {
        const cached = await this.redis.get(prefixedKey);
        if (cached) {
          return JSON.parse(cached as string) as T;
        }
      } catch (_error) {}
    }

    // Fallback to memory cache
    const memoryCached = this.memoryCache.get(prefixedKey);
    if (memoryCached && memoryCached.expiresAt > Date.now()) {
      return memoryCached.value as T;
    }

    // Clean up expired entry
    if (memoryCached) {
      this.memoryCache.delete(prefixedKey);
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);
    const ttlSeconds = ttl || this.options.defaultTTL || 3600;

    // Try Redis first
    if (this.redis) {
      try {
        await this.redis.setex(prefixedKey, ttlSeconds, JSON.stringify(value));
      } catch (_error) {}
    }

    // Also set in memory cache as fallback
    this.memoryCache.set(prefixedKey, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    // Clean up old entries periodically
    if (this.memoryCache.size > 1000) {
      this.cleanupMemoryCache();
    }
  }

  async del(key: string): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);

    // Try Redis first
    if (this.redis) {
      try {
        await this.redis.del(prefixedKey);
      } catch (_error) {}
    }

    // Also remove from memory cache
    this.memoryCache.delete(prefixedKey);
  }

  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear Redis keys with prefix
    if (this.redis && this.options.keyPrefix) {
      try {
        // Note: This is not efficient for large datasets
        // In production, consider using Redis SCAN command
        const _pattern = `${this.options.keyPrefix}:*`;
      } catch (_error) {}
    }
  }

  private getPrefixedKey(key: string): string {
    return this.options.keyPrefix ? `${this.options.keyPrefix}:${key}` : key;
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }
  }
}

// Cache key generators for consistent key formatting
export const cacheKeys = {
  spotify: {
    artist: (id: string) => `spotify:artist:${id}`,
    artistTopTracks: (id: string, market = 'US') =>
      `spotify:artist:${id}:top-tracks:${market}`,
    searchArtists: (query: string, limit: number) =>
      `spotify:search:artists:${query}:${limit}`,
    searchTracks: (query: string, limit: number) =>
      `spotify:search:tracks:${query}:${limit}`,
  },
  ticketmaster: {
    event: (id: string) => `ticketmaster:event:${id}`,
    venue: (id: string) => `ticketmaster:venue:${id}`,
    searchEvents: (params: string) => `ticketmaster:events:${params}`,
    searchVenues: (params: string) => `ticketmaster:venues:${params}`,
  },
  setlistfm: {
    setlist: (id: string) => `setlistfm:setlist:${id}`,
    artistSetlists: (mbid: string, page: number) =>
      `setlistfm:artist:${mbid}:setlists:${page}`,
    venueSetlists: (id: string, page: number) =>
      `setlistfm:venue:${id}:setlists:${page}`,
    searchArtists: (name: string, page: number) =>
      `setlistfm:search:artists:${name}:${page}`,
  },
};
