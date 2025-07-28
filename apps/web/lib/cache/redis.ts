import { env } from "@repo/env";

// Redis/Upstash cache implementation
export class CacheClient {
  private static instance: CacheClient;
  private baseUrl: string;
  private token: string;

  private constructor() {
    this.baseUrl = env["UPSTASH_REDIS_REST_URL"] || "";
    this.token = env["UPSTASH_REDIS_REST_TOKEN"] || "";
  }

  static getInstance(): CacheClient {
    if (!CacheClient.instance) {
      CacheClient.instance = new CacheClient();
    }
    return CacheClient.instance;
  }

  private async request(command: string[], pipeline = false) {
    if (!this.baseUrl || !this.token) {
      return null; // Gracefully handle missing Redis config
    }

    try {
      const url = pipeline
        ? `${this.baseUrl}/pipeline`
        : `${this.baseUrl}/${command.join("/")}`;

      const fetchInit: RequestInit = {
        method: pipeline ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
      };

      if (pipeline) {
        fetchInit.body = JSON.stringify(command);
      }

      const response = await fetch(url, fetchInit);

      if (!response.ok) {
        throw new Error(`Redis error: ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    } catch (_error) {
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const result = await this.request(["GET", key]);
    if (!result) {
      return null;
    }

    try {
      return JSON.parse(result);
    } catch {
      return result as T;
    }
  }

  async set(
    key: string,
    value: any,
    options?: { ex?: number; px?: number },
  ): Promise<boolean> {
    const args = ["SET", key, JSON.stringify(value)];

    if (options?.ex) {
      args.push("EX", options.ex.toString());
    } else if (options?.px) {
      args.push("PX", options.px.toString());
    }

    const result = await this.request(args);
    return result === "OK";
  }

  async del(key: string): Promise<number> {
    const result = await this.request(["DEL", key]);
    return result || 0;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.request(["EXPIRE", key, seconds.toString()]);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    const result = await this.request(["TTL", key]);
    return result || -1;
  }

  async incr(key: string): Promise<number> {
    const result = await this.request(["INCR", key]);
    return result || 0;
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    const result = await this.request(["ZADD", key, score.toString(), member]);
    return result || 0;
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    withScores = false,
  ): Promise<string[]> {
    const args = ["ZRANGE", key, start.toString(), stop.toString()];
    if (withScores) {
      args.push("WITHSCORES");
    }

    const result = await this.request(args);
    return result || [];
  }

  async pipeline(commands: string[][]): Promise<any[]> {
    if (!this.baseUrl || !this.token) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commands),
      });

      if (!response.ok) {
        throw new Error(`Redis error: ${response.status}`);
      }

      const data = await response.json();
      return data.result || [];
    } catch (_error) {
      return [];
    }
  }

  // Cache invalidation patterns
  async invalidatePattern(pattern: string): Promise<void> {
    // Upstash doesn't support SCAN, so we track keys in a set
    const keys = await this.request(["SMEMBERS", `cache:keys:${pattern}`]);
    if (keys && keys.length > 0) {
      await this.pipeline(keys.map((key: string) => ["DEL", key]));
      await this.del(`cache:keys:${pattern}`);
    }
  }

  // Helper for caching with patterns
  async setWithPattern(
    key: string,
    value: any,
    pattern: string,
    ttl?: number,
  ): Promise<boolean> {
    const pipeline = [
      ["SET", key, JSON.stringify(value)],
      ["SADD", `cache:keys:${pattern}`, key],
    ];

    if (ttl) {
      const firstCommand = pipeline[0];
      if (firstCommand) {
        firstCommand.push("EX", ttl.toString());
      }
      pipeline.push(["EXPIRE", `cache:keys:${pattern}`, (ttl + 60).toString()]); // Extra time for the set
    }

    const results = await this.pipeline(pipeline);
    return results?.[0] === "OK";
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

// Rate limiting using Redis
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

    const rateLimitKey = `${key}:${window}`;
    const count = await this.cache.incr(rateLimitKey);

    if (count === 1) {
      await this.cache.expire(rateLimitKey, windowSeconds + 60); // Extra buffer
    }

    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetAt: resetAt * 1000,
    };
  }
}
