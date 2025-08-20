import { Redis } from "@upstash/redis";
import type { CacheEntry, CacheStats } from "../types";

export interface CacheOptions {
  defaultTTL?: number; // seconds
  keyPrefix?: string;
  maxMemorySize?: number; // maximum number of entries in memory cache
  lruEnabled?: boolean; // enable LRU eviction
}

interface MemoryCacheEntry extends CacheEntry {
  lastAccessed: number;
  accessCount: number;
}

export class CacheManager {
  private redis: Redis | null;
  private options: Required<CacheOptions>;
  private memoryCache: Map<string, MemoryCacheEntry>;
  private stats: CacheStats;
  private cleanupInterval: NodeJS.Timeout;

  constructor(options: CacheOptions = {}) {
    this.options = {
      defaultTTL: 3600, // 1 hour default
      keyPrefix: "",
      maxMemorySize: 1000,
      lruEnabled: true,
      ...options,
    };

    // Initialize Redis if environment variables are available
    if (
      process.env["UPSTASH_REDIS_REST_URL"] &&
      process.env["UPSTASH_REDIS_REST_TOKEN"]
    ) {
      this.redis = new Redis({
        url: process.env["UPSTASH_REDIS_REST_URL"],
        token: process.env["UPSTASH_REDIS_REST_TOKEN"],
      });
    } else {
      this.redis = null;
    }

    // Initialize memory cache with LRU support
    this.memoryCache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalEntries: 0,
    };

    // Set up periodic cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupMemoryCache();
    }, 300000);
  }

  async get<T>(key: string): Promise<T | null> {
    const prefixedKey = this.getPrefixedKey(key);
    const now = Date.now();

    // Try Redis first
    if (this.redis) {
      try {
        const cached = await this.redis.get(prefixedKey);
        if (cached) {
          this.stats.hits++;
          this.updateHitRate();
          return JSON.parse(cached as string) as T;
        }
      } catch (_error) {
        // Redis error, continue to memory cache
      }
    }

    // Try memory cache
    const memoryCached = this.memoryCache.get(prefixedKey);
    if (memoryCached && memoryCached.expiresAt > now) {
      // Update access tracking for LRU
      memoryCached.lastAccessed = now;
      memoryCached.accessCount++;

      // Move to end (most recently used) if using LRU
      if (this.options.lruEnabled) {
        this.memoryCache.delete(prefixedKey);
        this.memoryCache.set(prefixedKey, memoryCached);
      }

      this.stats.hits++;
      this.updateHitRate();
      return memoryCached.value as T;
    }

    // Clean up expired entry
    if (memoryCached) {
      this.memoryCache.delete(prefixedKey);
      this.stats.totalEntries--;
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);
    const ttlSeconds = ttl || this.options.defaultTTL;
    const now = Date.now();

    // Try Redis first
    if (this.redis) {
      try {
        await this.redis.setex(prefixedKey, ttlSeconds, JSON.stringify(value));
      } catch (_error) {
        // Redis error, continue with memory cache
      }
    }

    // Ensure we don't exceed memory cache size limit
    if (this.memoryCache.size >= this.options.maxMemorySize) {
      this.evictLeastRecentlyUsed();
    }

    // Set in memory cache with enhanced tracking
    const cacheEntry: MemoryCacheEntry = {
      value,
      expiresAt: now + ttlSeconds * 1000,
      createdAt: now,
      lastAccessed: now,
      accessCount: 1,
    };

    this.memoryCache.set(prefixedKey, cacheEntry);
    this.stats.totalEntries = this.memoryCache.size;
  }

  async del(key: string): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);

    // Try Redis first
    if (this.redis) {
      try {
        await this.redis.del(prefixedKey);
      } catch (_error) {
        // Redis error, continue with memory cache
      }
    }

    // Remove from memory cache
    if (this.memoryCache.delete(prefixedKey)) {
      this.stats.totalEntries = this.memoryCache.size;
    }
  }

  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    this.stats.totalEntries = 0;
    this.resetStats();

    // Clear Redis keys with prefix
    if (this.redis && this.options.keyPrefix) {
      try {
        // Use SCAN for efficient key deletion in production
        const pattern = `${this.options.keyPrefix}:*`;
        const keys = await this.scanRedisKeys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (_error) {
        // Redis error, but memory cache is already cleared
      }
    }
  }

  private async scanRedisKeys(_pattern: string): Promise<string[]> {
    const keys: string[] = [];
    if (!this.redis) return keys;

    try {
      // Simple approach for now - in production, implement proper SCAN
      // This is a placeholder for proper Redis SCAN implementation
      // For now, we'll just clear the memory cache
    } catch (_error) {
      // Ignore scan errors
    }

    return keys;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalEntries: 0,
    };
  }

  private evictLeastRecentlyUsed(): void {
    if (!this.options.lruEnabled || this.memoryCache.size === 0) {
      return;
    }

    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    // Find the least recently used entry
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.stats.totalEntries = this.memoryCache.size;
    }
  }

  private getPrefixedKey(key: string): string {
    return this.options.keyPrefix ? `${this.options.keyPrefix}:${key}` : key;
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.stats.totalEntries = this.memoryCache.size;
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.memoryCache.clear();
    this.resetStats();
  }
}

// Cache key generators for consistent key formatting
export const cacheKeys = {
  spotify: {
    artist: (id: string) => `spotify:artist:${id}`,
    artistTopTracks: (id: string, market = "US") =>
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
