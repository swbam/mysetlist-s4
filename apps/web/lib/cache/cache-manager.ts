// MySetlist-S4 Production Cache Manager
// File: apps/web/lib/cache/cache-manager.ts
// Intelligent caching with predictive warming and TTL management

import { Redis } from 'ioredis';
import { RedisClientFactory } from '../queues/redis-config';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
  compress?: boolean;
  warmOnMiss?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  evictions: number;
  warmRequests: number;
  avgResponseTime: number;
}

export interface WarmingStrategy {
  pattern: string;
  interval: number; // minutes
  ttl: number; // seconds
  priority: number;
}

export class CacheManager {
  private static instance: CacheManager;
  private redis: Redis;
  private stats: Map<string, CacheStats> = new Map();
  private warmingStrategies: WarmingStrategy[] = [];
  private warmingInterval?: NodeJS.Timeout;

  private constructor() {
    this.redis = RedisClientFactory.getClient('cache');
    this.initializeWarmingStrategies();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Get item from cache with intelligent miss handling
   */
  async get<T>(
    key: string,
    fetcher?: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T | null> {
    const startTime = Date.now();
    const namespace = options.namespace || 'default';
    const fullKey = this.buildKey(namespace, key);

    try {
      // Try to get from cache
      const cached = await this.redis.get(fullKey);
      
      if (cached) {
        this.recordHit(namespace, Date.now() - startTime);
        
        if (options.compress) {
          return this.decompress<T>(cached);
        }
        
        return JSON.parse(cached) as T;
      }

      // Cache miss
      this.recordMiss(namespace, Date.now() - startTime);

      // If no fetcher provided, return null
      if (!fetcher) {
        return null;
      }

      // Fetch fresh data
      const data = await fetcher();
      
      // Cache the result
      await this.set(key, data, options);

      // Trigger warming if enabled
      if (options.warmOnMiss) {
        this.scheduleWarming(fullKey, fetcher, options.ttl);
      }

      return data;

    } catch (error) {
      this.recordError(namespace);
      console.error(`Cache error for key ${fullKey}:`, error);
      
      // Fallback to fetcher if available
      if (fetcher) {
        try {
          return await fetcher();
        } catch (fetchError) {
          console.error('Fetcher also failed:', fetchError);
        }
      }
      
      return null;
    }
  }

  /**
   * Set item in cache with TTL
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<boolean> {
    const namespace = options.namespace || 'default';
    const fullKey = this.buildKey(namespace, key);
    const ttl = options.ttl || 300; // Default 5 minutes

    try {
      let data: string;
      
      if (options.compress) {
        data = this.compress(value);
      } else {
        data = JSON.stringify(value);
      }

      await this.redis.setex(fullKey, ttl, data);
      return true;

    } catch (error) {
      console.error(`Failed to cache key ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Delete item from cache
   */
  async delete(key: string, namespace: string = 'default'): Promise<boolean> {
    const fullKey = this.buildKey(namespace, key);
    
    try {
      const result = await this.redis.del(fullKey);
      return result > 0;
    } catch (error) {
      console.error(`Failed to delete key ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Clear entire namespace
   */
  async clearNamespace(namespace: string): Promise<number> {
    const pattern = `${namespace}:*`;
    
    try {
      // Use SCAN to avoid blocking on large datasets
      const keys = await this.scanKeys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      // Delete in batches
      const batchSize = 100;
      let deleted = 0;
      
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        deleted += await this.redis.del(...batch);
      }

      this.recordEvictions(namespace, deleted);
      return deleted;

    } catch (error) {
      console.error(`Failed to clear namespace ${namespace}:`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(namespace?: string): CacheStats | Map<string, CacheStats> {
    if (namespace) {
      return this.stats.get(namespace) || this.createEmptyStats();
    }
    return new Map(this.stats);
  }

  /**
   * Reset statistics
   */
  resetStats(namespace?: string): void {
    if (namespace) {
      this.stats.delete(namespace);
    } else {
      this.stats.clear();
    }
  }

  /**
   * Start predictive cache warming
   */
  startWarming(): void {
    if (this.warmingInterval) {
      return; // Already running
    }

    // Run warming every minute
    this.warmingInterval = setInterval(async () => {
      await this.runWarmingCycle();
    }, 60000);

    // Run immediately
    this.runWarmingCycle();
  }

  /**
   * Stop cache warming
   */
  stopWarming(): void {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = undefined;
    }
  }

  /**
   * Initialize default warming strategies
   */
  private initializeWarmingStrategies(): void {
    this.warmingStrategies = [
      // Trending artists - warm every 5 minutes
      {
        pattern: 'artists:trending:*',
        interval: 5,
        ttl: 600, // 10 minutes
        priority: 10,
      },
      // Upcoming shows - warm every 10 minutes
      {
        pattern: 'shows:upcoming:*',
        interval: 10,
        ttl: 900, // 15 minutes
        priority: 8,
      },
      // Artist profiles with recent activity - warm every 15 minutes
      {
        pattern: 'artists:profile:active:*',
        interval: 15,
        ttl: 1800, // 30 minutes
        priority: 6,
      },
      // Popular setlists - warm every 30 minutes
      {
        pattern: 'setlists:popular:*',
        interval: 30,
        ttl: 3600, // 1 hour
        priority: 4,
      },
    ];
  }

  /**
   * Run a warming cycle
   */
  private async runWarmingCycle(): Promise<void> {
    console.log('🔥 Running cache warming cycle...');
    
    for (const strategy of this.warmingStrategies) {
      try {
        // Check if it's time to warm this pattern
        const lastWarmed = await this.redis.get(`warming:last:${strategy.pattern}`);
        const lastWarmedTime = lastWarmed ? parseInt(lastWarmed) : 0;
        const now = Date.now();
        
        if (now - lastWarmedTime < strategy.interval * 60 * 1000) {
          continue; // Skip this pattern
        }

        // Get keys matching pattern
        const keys = await this.scanKeys(strategy.pattern);
        
        if (keys.length === 0) {
          continue;
        }

        // Sort by priority and limit
        const keysToWarm = keys
          .slice(0, Math.min(keys.length, 50)) // Max 50 keys per pattern
          .sort(() => Math.random() - 0.5); // Randomize to avoid patterns

        console.log(`Warming ${keysToWarm.length} keys for pattern ${strategy.pattern}`);

        // Warm keys in parallel (but limited)
        const batchSize = 5;
        for (let i = 0; i < keysToWarm.length; i += batchSize) {
          const batch = keysToWarm.slice(i, i + batchSize);
          
          await Promise.all(
            batch.map(async (key) => {
              try {
                // Check if key is about to expire
                const ttl = await this.redis.ttl(key);
                
                if (ttl > 0 && ttl < strategy.ttl / 2) {
                  // Trigger re-warming
                  this.recordWarmRequest(this.extractNamespace(key));
                  console.log(`Key ${key} needs warming (TTL: ${ttl}s)`);
                  // In production, you would trigger the actual warming here
                }
              } catch (error) {
                console.error(`Failed to check key ${key}:`, error);
              }
            })
          );
        }

        // Update last warmed time
        await this.redis.setex(
          `warming:last:${strategy.pattern}`,
          strategy.interval * 60,
          now.toString()
        );

      } catch (error) {
        console.error(`Failed to warm pattern ${strategy.pattern}:`, error);
      }
    }
  }

  /**
   * Schedule warming for a specific key
   */
  private scheduleWarming(
    key: string,
    fetcher: () => Promise<any>,
    ttl?: number
  ): void {
    // Simple implementation - in production you'd use a job queue
    const warmingTime = ttl ? ttl * 0.8 * 1000 : 240000; // 80% of TTL or 4 minutes
    
    setTimeout(async () => {
      try {
        const data = await fetcher();
        await this.redis.setex(key, ttl || 300, JSON.stringify(data));
        console.log(`✅ Warmed cache key: ${key}`);
      } catch (error) {
        console.error(`Failed to warm key ${key}:`, error);
      }
    }, warmingTime);
  }

  /**
   * Scan keys matching pattern
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    
    do {
      const [newCursor, batch] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      
      keys.push(...batch);
      cursor = newCursor;
    } while (cursor !== '0');

    return keys;
  }

  /**
   * Build cache key with namespace
   */
  private buildKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  /**
   * Extract namespace from full key
   */
  private extractNamespace(fullKey: string): string {
    const parts = fullKey.split(':');
    return parts[0] || 'default';
  }

  /**
   * Compression stub - implement with zlib in production
   */
  private compress<T>(data: T): string {
    // In production, use zlib compression
    return JSON.stringify(data);
  }

  /**
   * Decompression stub
   */
  private decompress<T>(data: string): T {
    // In production, use zlib decompression
    return JSON.parse(data) as T;
  }

  /**
   * Statistics tracking methods
   */
  private recordHit(namespace: string, responseTime: number): void {
    const stats = this.getOrCreateStats(namespace);
    stats.hits++;
    this.updateAvgResponseTime(stats, responseTime);
  }

  private recordMiss(namespace: string, responseTime: number): void {
    const stats = this.getOrCreateStats(namespace);
    stats.misses++;
    this.updateAvgResponseTime(stats, responseTime);
  }

  private recordError(namespace: string): void {
    const stats = this.getOrCreateStats(namespace);
    stats.errors++;
  }

  private recordEvictions(namespace: string, count: number): void {
    const stats = this.getOrCreateStats(namespace);
    stats.evictions += count;
  }

  private recordWarmRequest(namespace: string): void {
    const stats = this.getOrCreateStats(namespace);
    stats.warmRequests++;
  }

  private getOrCreateStats(namespace: string): CacheStats {
    let stats = this.stats.get(namespace);
    if (!stats) {
      stats = this.createEmptyStats();
      this.stats.set(namespace, stats);
    }
    return stats;
  }

  private createEmptyStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      errors: 0,
      evictions: 0,
      warmRequests: 0,
      avgResponseTime: 0,
    };
  }

  private updateAvgResponseTime(stats: CacheStats, responseTime: number): void {
    const total = stats.hits + stats.misses;
    stats.avgResponseTime = 
      (stats.avgResponseTime * (total - 1) + responseTime) / total;
  }
}

// Export singleton instance getter
export const cacheManager = CacheManager.getInstance();

// Export cache decorators for easy use
export function Cacheable(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = `${propertyKey}:${JSON.stringify(args)}`;
      
      return cacheManager.get(
        key,
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}

// Helper functions for common cache operations
export const artistCache = {
  async get(artistId: string): Promise<any> {
    return cacheManager.get(
      artistId,
      undefined,
      { namespace: 'artists', ttl: 600 }
    );
  },
  
  async set(artistId: string, data: any): Promise<boolean> {
    return cacheManager.set(
      artistId,
      data,
      { namespace: 'artists', ttl: 600 }
    );
  },
  
  async invalidate(artistId: string): Promise<boolean> {
    return cacheManager.delete(artistId, 'artists');
  },
};

export const showCache = {
  async get(showId: string): Promise<any> {
    return cacheManager.get(
      showId,
      undefined,
      { namespace: 'shows', ttl: 900 }
    );
  },
  
  async set(showId: string, data: any): Promise<boolean> {
    return cacheManager.set(
      showId,
      data,
      { namespace: 'shows', ttl: 900 }
    );
  },
  
  async invalidate(showId: string): Promise<boolean> {
    return cacheManager.delete(showId, 'shows');
  },
};
