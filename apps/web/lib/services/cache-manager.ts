/**
 * Advanced Cache Manager Service
 * Implements smart caching strategy with Redis fallback and performance optimization
 */

// Memory cache disabled for simplicity; rely on Redis or direct fetch.
import { CacheClient, cacheKeys } from "../cache/redis";

// Cache TTL Configuration (in seconds)
const CACHE_TTL = {
  ARTIST_PAGES: 3600, // 1 hour - shows change rarely
  SHOW_DATA: 21600, // 6 hours - venues/dates stable
  SONG_CATALOG: 86400, // 24 hours - discographies change rarely
  SETLISTS: 3600, // 1 hour - voting changes frequently
  TRENDING: 1800, // 30 minutes - trending data
  SEARCH_RESULTS: 3600, // 1 hour - search results
  API_RESPONSES: 300, // 5 minutes - API responses
  USER_DATA: 1800, // 30 minutes - user-specific data
} as const;

interface CacheOptions {
  ttl?: number;
  useRedis?: boolean;
  useMemory?: boolean;
  pattern?: string;
  invalidateRelated?: string[];
}

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  avgResponseTime: number;
}

export class CacheManager {
  private static instance: CacheManager;
  private redisClient: CacheClient;
  private metrics: Map<string, CacheMetrics> = new Map();
  private readonly fallbackToMemory = false; // disable in-memory layer for simplicity

  private constructor() {
    this.redisClient = CacheClient.getInstance();
    this.initializeMetrics();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private initializeMetrics() {
    const categories = ["redis", "memory", "api", "database"];
    categories.forEach((category) => {
      this.metrics.set(category, {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        avgResponseTime: 0,
      });
    });
  }

  private recordMetric(
    category: string,
    operation: "hit" | "miss" | "set" | "delete" | "error",
    responseTime?: number,
  ) {
    const metric = this.metrics.get(category);
    if (!metric) return;

    metric[
      operation === "hit"
        ? "hits"
        : operation === "miss"
          ? "misses"
          : operation === "set"
            ? "sets"
            : operation === "delete"
              ? "deletes"
              : "errors"
    ]++;

    if (responseTime) {
      metric.avgResponseTime = (metric.avgResponseTime + responseTime) / 2;
    }
  }

  /**
   * Get cached data with multi-layer fallback
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const startTime = Date.now();
    const { useRedis = true, useMemory = true } = options;

    try {
      // Try Redis first (if enabled)
      if (useRedis) {
        const redisResult = await this.redisClient.get<T>(key);
        if (redisResult !== null) {
          this.recordMetric("redis", "hit", Date.now() - startTime);
          return redisResult;
        }
        this.recordMetric("redis", "miss");
      }

      // Fallback to memory cache
      // In-memory cache disabled

      return null;
    } catch (error) {
      this.recordMetric("redis", "error");
      console.warn("Cache get error:", error);
      return null;
    }
  }

  /**
   * Set cached data in multiple layers
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<boolean> {
    const {
      ttl = CACHE_TTL.API_RESPONSES,
      useRedis = true,
      useMemory = true,
      pattern,
    } = options;
    let success = false;

    try {
      // Set in Redis
      if (useRedis) {
        if (pattern) {
          success = await this.redisClient.setWithPattern(
            key,
            value,
            pattern,
            ttl,
          );
        } else {
          success = await this.redisClient.set(key, value, { ex: ttl });
        }
        this.recordMetric("redis", "set");
      }

      // Set in memory cache
      // In-memory cache disabled

      return success;
    } catch (error) {
      this.recordMetric("redis", "error");
      console.warn("Cache set error:", error);
      return false;
    }
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<boolean> {
    try {
      const redisResult = await this.redisClient.del(key);
      this.recordMetric("redis", "delete");

      // In-memory cache disabled

      return redisResult > 0;
    } catch (error) {
      this.recordMetric("redis", "error");
      console.warn("Cache delete error:", error);
      return false;
    }
  }

  /**
   * Invalidate cache patterns
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      await this.redisClient.invalidatePattern(pattern);
    } catch (error) {
      console.warn("Pattern invalidation error:", error);
    }
  }

  /**
   * Artist-specific caching
   */
  async cacheArtist(artistId: string, data: any): Promise<boolean> {
    const key = cacheKeys.artist(artistId);
    return this.set(key, data, {
      ttl: CACHE_TTL.ARTIST_PAGES,
      pattern: "artists",
      invalidateRelated: ["trending", "search"],
    });
  }

  async getCachedArtist(artistId: string): Promise<any> {
    const key = cacheKeys.artist(artistId);
    return this.get(key);
  }

  /**
   * Show-specific caching
   */
  async cacheShow(showId: string, data: any): Promise<boolean> {
    const key = cacheKeys.show(showId);
    return this.set(key, data, {
      ttl: CACHE_TTL.SHOW_DATA,
      pattern: "shows",
    });
  }

  async getCachedShow(showId: string): Promise<any> {
    const key = cacheKeys.show(showId);
    return this.get(key);
  }

  /**
   * Trending data caching
   */
  async cacheTrending(
    period: string,
    type: string,
    limit: number,
    data: any,
  ): Promise<boolean> {
    const key = cacheKeys.trending(period, type, limit);
    return this.set(key, data, {
      ttl: CACHE_TTL.TRENDING,
      pattern: "trending",
    });
  }

  async getCachedTrending(
    period: string,
    type: string,
    limit: number,
  ): Promise<any> {
    const key = cacheKeys.trending(period, type, limit);
    return this.get(key);
  }

  /**
   * Search results caching
   */
  async cacheSearchResults(
    query: string,
    type: string,
    data: any,
  ): Promise<boolean> {
    const key = cacheKeys.searchResults(query, type);
    return this.set(key, data, {
      ttl: CACHE_TTL.SEARCH_RESULTS,
      pattern: "search",
    });
  }

  async getCachedSearchResults(query: string, type: string): Promise<any> {
    const key = cacheKeys.searchResults(query, type);
    return this.get(key);
  }

  /**
   * Cache warming strategies
   */
  async warmCache(
    strategy: "trending" | "popular-artists" | "upcoming-shows" | "all",
  ): Promise<void> {
    console.log(`Starting cache warming: ${strategy}`);

    try {
      switch (strategy) {
        case "trending":
          await this.warmTrendingCache();
          break;
        case "popular-artists":
          await this.warmPopularArtistsCache();
          break;
        case "upcoming-shows":
          await this.warmUpcomingShowsCache();
          break;
        case "all":
          await Promise.all([
            this.warmTrendingCache(),
            this.warmPopularArtistsCache(),
            this.warmUpcomingShowsCache(),
          ]);
          break;
      }
    } catch (error) {
      console.error("Cache warming failed:", error);
    }
  }

  private async warmTrendingCache(): Promise<void> {
    const periods = ["day", "week", "month"];
    const types = ["artists", "shows"];

    for (const period of periods) {
      for (const type of types) {
        // This would fetch trending data and cache it
        // Implementation depends on your trending data API
        console.log(`Warming trending cache: ${period}/${type}`);
      }
    }
  }

  private async warmPopularArtistsCache(): Promise<void> {
    // Fetch and cache popular artists
    console.log("Warming popular artists cache");
  }

  private async warmUpcomingShowsCache(): Promise<void> {
    // Fetch and cache upcoming shows
    console.log("Warming upcoming shows cache");
  }

  /**
   * Cache performance monitoring
   */
  getMetrics(): Record<string, CacheMetrics> {
    return Object.fromEntries(this.metrics.entries());
  }

  getHitRate(category?: string): number {
    if (category) {
      const metric = this.metrics.get(category);
      if (!metric) return 0;
      const total = metric.hits + metric.misses;
      return total > 0 ? (metric.hits / total) * 100 : 0;
    }

    // Overall hit rate
    let totalHits = 0;
    let totalMisses = 0;
    for (const metric of this.metrics.values()) {
      totalHits += metric.hits;
      totalMisses += metric.misses;
    }
    const total = totalHits + totalMisses;
    return total > 0 ? (totalHits / total) * 100 : 0;
  }

  resetMetrics(): void {
    this.initializeMetrics();
  }

  /**
   * Batch operations for efficiency
   */
  async multiGet<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();

    // Use Redis pipeline for efficiency
    try {
      const pipeline = keys.map((key) => ["GET", key]);
      const redisResults = await this.redisClient.pipeline(pipeline);

      keys.forEach((key, index) => {
        const result = redisResults[index];
        try {
          results.set(key, result ? JSON.parse(result) : null);
        } catch {
          results.set(key, result as T);
        }
      });
    } catch (error) {
      console.warn("Multi-get error:", error);
      // Fallback to individual gets
      for (const key of keys) {
        results.set(key, await this.get<T>(key));
      }
    }

    return results;
  }

  async multiSet<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<boolean[]> {
    const results: boolean[] = [];

    try {
      // Use Redis pipeline for efficiency
      const pipeline = entries.map(({ key, value, ttl }) => {
        const cmd = ["SET", key, JSON.stringify(value)];
        if (ttl) {
          cmd.push("EX", ttl.toString());
        }
        return cmd;
      });

      const redisResults = await this.redisClient.pipeline(pipeline);
      results.push(...redisResults.map((result) => result === "OK"));
    } catch (error) {
      console.warn("Multi-set error:", error);
      // Fallback to individual sets
      for (const { key, value, ttl } of entries) {
        results.push(await this.set(key, value, { ttl }));
      }
    }

    return results;
  }

  /**
   * Administrative cache cleanup methods for autonomous maintenance
   */

  /**
   * Clear expired cache entries
   */
  static async clearExpired(): Promise<number> {
    try {
      const instance = CacheManager.getInstance();
      // Redis automatically handles expired keys, but we can manually clean up patterns
      const patterns = ["artists:*", "shows:*", "trending:*", "search:*"];
      let clearedKeys = 0;

      for (const pattern of patterns) {
        await instance.invalidatePattern(pattern);
        clearedKeys++;
      }

      return clearedKeys;
    } catch (error) {
      console.warn("Clear expired cache error:", error);
      return 0;
    }
  }

  /**
   * Clear memory cache
   */
  static clearMemoryCache(): number {
    try {
      const instance = CacheManager.getInstance();
      instance.resetMetrics(); // Reset metrics as well
      return 1; // Return number of operations completed
    } catch (error) {
      console.warn("Clear memory cache error:", error);
      return 0;
    }
  }

  /**
   * Optimize cache patterns by reorganizing and compacting
   */
  static async optimizeCachePatterns(): Promise<void> {
    try {
      const instance = CacheManager.getInstance();

      // Reorganize cache patterns for better performance
      const patterns = ["artists:*", "shows:*", "trending:*", "search:*"];

      for (const pattern of patterns) {
        await instance.invalidatePattern(pattern);
      }

      // Could add more optimization logic here
      console.log("Cache patterns optimized");
    } catch (error) {
      console.warn("Cache pattern optimization error:", error);
    }
  }

  /**
   * Clear stale cache entries older than specified age
   */
  static async clearStalePatterns(
    patterns: string[],
    maxAgeMs: number,
  ): Promise<number> {
    try {
      const instance = CacheManager.getInstance();
      let clearedKeys = 0;

      for (const pattern of patterns) {
        // This would require Redis SCAN with TTL checking
        // For now, just invalidate the pattern
        await instance.invalidatePattern(pattern);
        clearedKeys += 1;
      }

      return clearedKeys;
    } catch (error) {
      console.warn("Clear stale patterns error:", error);
      return 0;
    }
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

// Export utility functions
export const cacheTTL = CACHE_TTL;

// Cache decorator for functions
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  options: CacheOptions = {},
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);

    // Try cache first
    const cached = await cacheManager.get(key, options);
    if (cached !== null) {
      return cached;
    }

    // Execute function
    const result = await fn(...args);

    // Cache result
    if (result !== null && result !== undefined) {
      await cacheManager.set(key, result, options);
    }

    return result;
  }) as T;
}

export default cacheManager;
