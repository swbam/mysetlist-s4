// Production Redis cache implementation for MySetlist-S4
import { RedisClientFactory } from "../queues/redis-config";
import type { Redis } from "ioredis";

export class CacheClient {
  private static instance: CacheClient;
  private redisClient: Redis;

  private constructor() {
    this.redisClient = RedisClientFactory.getClient('cache');
  }

  static getInstance(): CacheClient {
    if (!CacheClient.instance) {
      CacheClient.instance = new CacheClient();
    }
    return CacheClient.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.redisClient.get(key);
      if (!result) {
        return null;
      }

      try {
        return JSON.parse(result);
      } catch {
        return result as T;
      }
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(
    key: string,
    value: any,
    options?: { ex?: number; px?: number },
  ): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      
      if (options?.ex) {
        await this.redisClient.setex(key, options.ex, serialized);
      } else if (options?.px) {
        await this.redisClient.psetex(key, options.px, serialized);
      } else {
        await this.redisClient.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await this.redisClient.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error);
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.redisClient.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redisClient.ttl(key);
    } catch (error) {
      console.error('Redis TTL error:', error);
      return -1;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.redisClient.incr(key);
    } catch (error) {
      console.error('Redis INCR error:', error);
      return 0;
    }
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      return await this.redisClient.zadd(key, score, member);
    } catch (error) {
      console.error('Redis ZADD error:', error);
      return 0;
    }
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    withScores = false,
  ): Promise<string[]> {
    try {
      if (withScores) {
        return await this.redisClient.zrange(key, start, stop, 'WITHSCORES');
      }
      return await this.redisClient.zrange(key, start, stop);
    } catch (error) {
      console.error('Redis ZRANGE error:', error);
      return [];
    }
  }

  async pipeline(commands: string[][]): Promise<any[]> {
    try {
      const pipeline = this.redisClient.pipeline();
      
      for (const command of commands) {
        const [cmd, ...args] = command;
        if (cmd) {
          (pipeline as any)[cmd.toLowerCase()](...args);
        }
      }
      
      const results = await pipeline.exec();
      return results?.map(([err, result]) => {
        if (err) throw err;
        return result;
      }) || [];
    } catch (error) {
      console.error('Redis PIPELINE error:', error);
      return [];
    }
  }

  // Cache invalidation patterns using Redis SCAN (production-ready)
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const stream = this.redisClient.scanStream({
        match: `${pattern}*`,
        count: 100,
      });

      const keysToDelete: string[] = [];

      stream.on('data', (keys: string[]) => {
        keysToDelete.push(...keys);
      });

      stream.on('end', async () => {
        if (keysToDelete.length > 0) {
          // Delete keys in batches
          const batchSize = 100;
          for (let i = 0; i < keysToDelete.length; i += batchSize) {
            const batch = keysToDelete.slice(i, i + batchSize);
            await this.redisClient.del(...batch);
          }
        }
      });
    } catch (error) {
      console.error('Redis INVALIDATE_PATTERN error:', error);
      // Fallback: try to get keys from our tracking sets
      try {
        const keys = await this.redisClient.smembers(`cache:keys:${pattern}`);
        if (keys.length > 0) {
          await this.del(`cache:keys:${pattern}`);
          await this.redisClient.del(...keys);
        }
      } catch (fallbackError) {
        console.error('Redis pattern invalidation fallback error:', fallbackError);
      }
    }
  }

  // Helper for caching with patterns and tracking
  async setWithPattern(
    key: string,
    value: any,
    pattern: string,
    ttl?: number,
  ): Promise<boolean> {
    try {
      const pipeline = this.redisClient.pipeline();
      
      pipeline.set(key, JSON.stringify(value));
      pipeline.sadd(`cache:keys:${pattern}`, key);

      if (ttl) {
        pipeline.expire(key, ttl);
        pipeline.expire(`cache:keys:${pattern}`, ttl + 60); // Extra time for the tracking set
      }

      const results = await pipeline.exec();
      return results?.[0]?.[1] === 'OK';
    } catch (error) {
      console.error('Redis SET_WITH_PATTERN error:', error);
      return false;
    }
  }

  // Health check method
  async ping(): Promise<boolean> {
    try {
      const result = await this.redisClient.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis PING error:', error);
      return false;
    }
  }

  // Get connection status
  getStatus(): string {
    return this.redisClient.status;
  }

  // Remove range by score for rate limiting
  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    try {
      return await this.redisClient.zremrangebyscore(key, min, max);
    } catch (error) {
      console.error('Redis ZREMRANGEBYSCORE error:', error);
      return 0;
    }
  }

  // Pub/Sub methods for real-time features
  async publish(channel: string, message: any): Promise<number> {
    try {
      return await this.redisClient.publish(channel, JSON.stringify(message));
    } catch (error) {
      console.error('Redis PUBLISH error:', error);
      return 0;
    }
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      const pubsubClient = RedisClientFactory.getClient('pubsub');
      await pubsubClient.subscribe(channel);
      
      pubsubClient.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            callback(JSON.parse(message));
          } catch {
            callback(message);
          }
        }
      });
    } catch (error) {
      console.error('Redis SUBSCRIBE error:', error);
    }
  }
}

// Cache key generators
export const cacheKeys = {
  trending: (period: string, type: string, limit: number) =>
    `trending:${period}:${type}:${limit}`,

  artist: (id: string) => `artist:${id}`,

  show: (id: string) => `show:${id}`,

  venue: (id: string) => `venue:${id}`,

  userVotes: (userId: string, showId: string) => `votes:${userId}:${showId}`,

  searchResults: (query: string, type: string) =>
    `search:${type}:${query.toLowerCase().replace(/\s+/g, "-")}`,

  syncProgress: (artistId: string) => `sync:progress:${artistId}`,

  apiRateLimit: (apiName: string, identifier: string) =>
    `ratelimit:${apiName}:${identifier}`,

  // Additional cache keys for performance
  artistShows: (artistId: string) => `artist:${artistId}:shows`,
  artistSongs: (artistId: string) => `artist:${artistId}:songs`,
  showSetlists: (showId: string) => `show:${showId}:setlists`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  popularContent: (type: string) => `popular:${type}`,
};

// Cache decorators for common patterns
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl = 300, // 5 minutes default
): T {
  return (async (...args: Parameters<T>) => {
    const cache = CacheClient.getInstance();
    const key = keyGenerator(...args);

    // Try cache first
    const cached = await cache.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function
    const result = await fn(...args);

    // Cache result
    if (result !== null && result !== undefined) {
      await cache.set(key, result, { ex: ttl });
    }

    return result;
  }) as T;
}

// Enhanced rate limiting using Redis
export class RedisRateLimiter {
  private cache = CacheClient.getInstance();

  async checkLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Math.floor(Date.now() / 1000);
    const window = Math.floor(now / windowSeconds) * windowSeconds;
    const resetAt = window + windowSeconds;

    const rateLimitKey = `ratelimit:${key}:${window}`;
    
    try {
      const count = await this.cache.incr(rateLimitKey);

      if (count === 1) {
        await this.cache.expire(rateLimitKey, windowSeconds + 60); // Extra buffer
      }

      return {
        allowed: count <= maxRequests,
        remaining: Math.max(0, maxRequests - count),
        resetAt: resetAt * 1000,
      };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow requests if Redis is down
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: resetAt * 1000,
      };
    }
  }

  // Sliding window rate limiter for more precise control
  async checkSlidingWindowLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    
    const rateLimitKey = `sliding:${key}`;
    
    try {
      // Remove old entries and add current timestamp
      await this.cache.zadd(rateLimitKey, now, `${now}`);
      await this.cache.zremrangebyscore(rateLimitKey, 0, windowStart); // Remove old entries
      
      // Count current requests in window
      const count = (await this.cache.zrange(rateLimitKey, 0, -1)).length;
      
      // Set expiry
      await this.cache.expire(rateLimitKey, windowSeconds + 60);
      
      return {
        allowed: count <= maxRequests,
        remaining: Math.max(0, maxRequests - count),
      };
    } catch (error) {
      console.error('Sliding window rate limiter error:', error);
      return {
        allowed: true,
        remaining: maxRequests,
      };
    }
  }
}