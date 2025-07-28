import { createClient } from "~/lib/supabase/server";
import { CacheClient } from "~/lib/cache/redis";

export interface CacheStrategy {
  key: string;
  ttl: number;
  invalidateOn: string[];
  compression: boolean;
  tags: string[];
}

export interface DatabaseOptimization {
  query: string;
  indexes: string[];
  partitioning: boolean;
  caching: CacheStrategy;
}

export interface PerformanceMetrics {
  queryTime: number;
  cacheHitRate: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

class DataOptimizationService {
  private cache: CacheClient;
  private supabase: ReturnType<typeof createClient>;
  private queryCache: Map<
    string,
    { data: any; timestamp: number; ttl: number }
  > = new Map();
  private queryStats: Map<string, PerformanceMetrics> = new Map();
  private compressionEnabled: boolean;

  constructor() {
    this.cache = CacheClient.getInstance();
    this.supabase = createClient();
    this.compressionEnabled = process.env?.["ENABLE_COMPRESSION"] === "true";
  }

  // Intelligent query caching with automatic invalidation
  async getCachedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    strategy: CacheStrategy,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      // Check memory cache first
      const memoryResult = this.queryCache.get(key);
      if (
        memoryResult &&
        Date.now() - memoryResult.timestamp < memoryResult.ttl * 1000
      ) {
        this.updateQueryStats(key, Date.now() - startTime, true);
        return memoryResult.data;
      }

      // Check Redis cache
      const cachedResult = await this.cache.get<any>(key);
      if (cachedResult) {
        let data;
        try {
          // If compression is enabled, the cached result should be a compressed string
          // Otherwise, it's already parsed by cache.get
          data =
            strategy.compression && typeof cachedResult === "string"
              ? JSON.parse(await this.decompress(cachedResult))
              : cachedResult;

          // Update memory cache
          this.queryCache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: strategy.ttl,
          });

          this.updateQueryStats(key, Date.now() - startTime, true);
          return data;
        } catch (error) {
          console.warn("Failed to parse cached data:", error);
          // Fall through to fresh query
        }
      }

      // Execute fresh query
      const result = await queryFn();

      // Cache the result
      await this.cacheResult(key, result, strategy);

      // Update memory cache
      this.queryCache.set(key, {
        data: result,
        timestamp: Date.now(),
        ttl: strategy.ttl,
      });

      this.updateQueryStats(key, Date.now() - startTime, false);
      return result;
    } catch (error) {
      this.updateQueryStats(key, Date.now() - startTime, false, true);
      throw error;
    }
  }

  // Intelligent cache invalidation
  async invalidateCache(pattern: string | string[]): Promise<void> {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];

    for (const p of patterns) {
      // TODO: Implement Redis pattern-based invalidation when full Redis client is available
      // For now, we can only invalidate memory cache

      // Invalidate memory cache
      for (const [key] of this.queryCache.entries()) {
        if (key.includes(p.replace("*", ""))) {
          this.queryCache.delete(key);
        }
      }
    }
  }

  // Cache warmer for predictive caching
  async warmCache(
    routes: Array<{
      key: string;
      queryFn: () => Promise<any>;
      strategy: CacheStrategy;
    }>,
  ): Promise<void> {
    const promises = routes.map(async ({ key, queryFn, strategy }) => {
      try {
        const result = await queryFn();
        await this.cacheResult(key, result, strategy);
      } catch (error) {
        console.error(`Failed to warm cache for ${key}:`, error);
      }
    });

    await Promise.all(promises);
  }

  // Database query optimization
  async optimizeQuery(query: string, params: any[] = []): Promise<any> {
    const supabase = await this.supabase;
    const startTime = Date.now();

    try {
      // Add query optimization hints
      const optimizedQuery = this.addQueryOptimizations(query);

      // Execute query with performance monitoring
      const { data, error } = await supabase.rpc("execute_optimized_query", {
        query: optimizedQuery,
        params,
      });

      if (error) throw error;

      // Log query performance
      const queryTime = Date.now() - startTime;
      this.logQueryPerformance(query, queryTime, data?.length || 0);

      return data;
    } catch (error) {
      console.error("Query optimization failed:", error);
      throw error;
    }
  }

  // Add query optimization hints
  private addQueryOptimizations(query: string): string {
    let optimizedQuery = query;

    // Add index hints for common patterns
    if (query.includes("WHERE") && query.includes("ORDER BY")) {
      optimizedQuery = optimizedQuery.replace(
        /ORDER BY\s+(\w+)/g,
        "ORDER BY $1 /* INDEX_HINT */",
      );
    }

    // Add LIMIT for potentially large result sets
    if (!query.includes("LIMIT") && query.includes("SELECT")) {
      optimizedQuery += " LIMIT 1000";
    }

    // Add query planner hints
    optimizedQuery = `/* QUERY_OPTIMIZER_HINTS */ ${optimizedQuery}`;

    return optimizedQuery;
  }

  // Real-time data processing with batching
  async processBatchData(
    data: any[],
    batchSize: number = 100,
    processor: (batch: any[]) => Promise<void>,
  ): Promise<{ processed: number; failed: number; errors: string[] }> {
    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process data in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      try {
        await processor(batch);
        results.processed += batch.length;
      } catch (error) {
        results.failed += batch.length;
        results.errors.push(
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }

    return results;
  }

  // Intelligent data prefetching
  async prefetchData(userId: string): Promise<void> {
    const supabase = await this.supabase;

    // Prefetch user's commonly accessed data
    const prefetchTasks = [
      // User's followed artists
      this.getCachedQuery(
        `user:${userId}:followed_artists`,
        async () => {
          const { data } = await supabase
            .from("user_follows_artists")
            .select("artists(id, name, image_url)")
            .eq("user_id", userId)
            .limit(50);
          return data;
        },
        {
          key: `user:${userId}:followed_artists`,
          ttl: 3600, // 1 hour
          invalidateOn: ["user_follows_artists"],
          compression: true,
          tags: ["user", "artists"],
        },
      ),

      // User's recent votes
      this.getCachedQuery(
        `user:${userId}:recent_votes`,
        async () => {
          const { data } = await supabase
            .from("setlist_votes")
            .select(
              `
              id,
              vote_value,
              created_at,
              setlist_songs(
                songs(title, artist_id),
                setlists(
                  shows(name, date, artists(name))
                )
              )
            `,
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(100);
          return data;
        },
        {
          key: `user:${userId}:recent_votes`,
          ttl: 1800, // 30 minutes
          invalidateOn: ["setlist_votes"],
          compression: true,
          tags: ["user", "votes"],
        },
      ),

      // Trending shows
      this.getCachedQuery(
        "trending_shows",
        async () => {
          const { data } = await supabase
            .from("shows")
            .select(
              `
              id,
              name,
              date,
              trending_score,
              artists(name, image_url),
              venues(name, city)
            `,
            )
            .order("trending_score", { ascending: false })
            .limit(20);
          return data;
        },
        {
          key: "trending_shows",
          ttl: 900, // 15 minutes
          invalidateOn: ["shows"],
          compression: true,
          tags: ["trending", "shows"],
        },
      ),
    ];

    // Execute prefetch tasks in parallel
    await Promise.all(prefetchTasks);
  }

  // Database connection pooling optimization
  async optimizeConnections(): Promise<void> {
    // This would configure connection pool settings
    // For Supabase, this is handled automatically, but we can optimize our usage

    // Implement connection recycling
    const connectionHealth = await this.checkConnectionHealth();

    if (connectionHealth.unhealthy > 0) {
      console.warn(
        `${connectionHealth.unhealthy} unhealthy connections detected`,
      );
      // Implement connection recovery logic
    }
  }

  // Check database connection health
  private async checkConnectionHealth(): Promise<{
    healthy: number;
    unhealthy: number;
  }> {
    try {
      const supabase = await this.supabase;
      const { error } = await supabase.rpc("check_connection_health");

      if (error) {
        return { healthy: 0, unhealthy: 1 };
      }

      return { healthy: 1, unhealthy: 0 };
    } catch (error) {
      return { healthy: 0, unhealthy: 1 };
    }
  }

  // Intelligent data compression
  private async compress(data: string): Promise<string> {
    if (!this.compressionEnabled) return data;

    // Simple compression using gzip
    const { gzip } = await import("zlib");
    const { promisify } = await import("util");
    const gzipAsync = promisify(gzip);

    const compressed = await gzipAsync(Buffer.from(data));
    return compressed.toString("base64");
  }

  private async decompress(data: string): Promise<string> {
    if (!this.compressionEnabled) return data;

    const { gunzip } = await import("zlib");
    const { promisify } = await import("util");
    const gunzipAsync = promisify(gunzip);

    const decompressed = await gunzipAsync(Buffer.from(data, "base64"));
    return decompressed.toString();
  }

  // Cache result with compression and tags
  private async cacheResult(
    key: string,
    data: any,
    strategy: CacheStrategy,
  ): Promise<void> {
    try {
      let serialized = JSON.stringify(data);

      if (strategy.compression) {
        serialized = await this.compress(serialized);
      }

      // Set cache with TTL
      await this.cache.set(key, serialized, { ex: strategy.ttl });

      // TODO: Implement tag-based invalidation when full Redis client is available
      // Tags would allow group invalidation of related cache entries
    } catch (error) {
      console.error("Failed to cache result:", error);
    }
  }

  // Update query performance statistics
  private updateQueryStats(
    key: string,
    queryTime: number,
    cacheHit: boolean,
    error: boolean = false,
  ): void {
    const stats = this.queryStats.get(key) || {
      queryTime: 0,
      cacheHitRate: 0,
      throughput: 0,
      errorRate: 0,
      memoryUsage: 0,
      cpuUsage: 0,
    };

    stats.queryTime = (stats.queryTime + queryTime) / 2;
    stats.cacheHitRate = cacheHit
      ? Math.min(stats.cacheHitRate + 0.1, 1)
      : Math.max(stats.cacheHitRate - 0.1, 0);
    stats.errorRate = error
      ? Math.min(stats.errorRate + 0.1, 1)
      : Math.max(stats.errorRate - 0.05, 0);
    stats.throughput = 1000 / queryTime; // queries per second

    this.queryStats.set(key, stats);
  }

  // Log query performance for monitoring
  private logQueryPerformance(
    query: string,
    queryTime: number,
    resultCount: number,
  ): void {
    if (queryTime > 1000) {
      // Log slow queries
      console.warn(
        `Slow query detected: ${query.substring(0, 100)}... (${queryTime}ms, ${resultCount} results)`,
      );
    }
  }

  // Get performance metrics
  getPerformanceMetrics(): Map<string, PerformanceMetrics> {
    return this.queryStats;
  }

  // Clear all caches
  async clearAllCaches(): Promise<void> {
    // TODO: Implement cache flush when full Redis client is available
    // For now, clear memory cache
    this.queryCache.clear();
    this.queryStats.clear();
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    memoryCache: { size: number; hitRate: number };
    redisCache: { size: number; memory: string };
  }> {
    const memorySize = this.queryCache.size;
    const avgHitRate =
      Array.from(this.queryStats.values()).reduce(
        (sum, stats) => sum + stats.cacheHitRate,
        0,
      ) / this.queryStats.size || 0;

    // TODO: Implement Redis stats when full Redis client is available
    return {
      memoryCache: {
        size: memorySize,
        hitRate: avgHitRate,
      },
      redisCache: {
        size: 0, // Not available with current cache client
        memory: "N/A",
      },
    };
  }

  // Cleanup expired cache entries
  async cleanupExpiredCache(): Promise<void> {
    const now = Date.now();

    // Clean memory cache
    for (const [key, entry] of this.queryCache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.queryCache.delete(key);
      }
    }

    // TODO: Implement tag cleanup when full Redis client is available
    // Redis handles TTL automatically for regular keys
  }

  // Shutdown cleanup
  async shutdown(): Promise<void> {
    // CacheClient doesn't have quit method - it uses HTTP connections
    this.queryCache.clear();
    this.queryStats.clear();
  }
}

// Export singleton instance
export const dataOptimizationService = new DataOptimizationService();

// Utility functions
export async function getCachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  strategy: CacheStrategy,
): Promise<T> {
  return dataOptimizationService.getCachedQuery(key, queryFn, strategy);
}

export async function invalidateCache(
  pattern: string | string[],
): Promise<void> {
  return dataOptimizationService.invalidateCache(pattern);
}

export async function warmCache(
  routes: Array<{
    key: string;
    queryFn: () => Promise<any>;
    strategy: CacheStrategy;
  }>,
): Promise<void> {
  return dataOptimizationService.warmCache(routes);
}

export async function prefetchUserData(userId: string): Promise<void> {
  return dataOptimizationService.prefetchData(userId);
}

export async function processBatchData(
  data: any[],
  batchSize: number,
  processor: (batch: any[]) => Promise<void>,
): Promise<{ processed: number; failed: number; errors: string[] }> {
  return dataOptimizationService.processBatchData(data, batchSize, processor);
}

export async function getCacheStats(): Promise<any> {
  return dataOptimizationService.getCacheStats();
}

export async function clearAllCaches(): Promise<void> {
  return dataOptimizationService.clearAllCaches();
}
