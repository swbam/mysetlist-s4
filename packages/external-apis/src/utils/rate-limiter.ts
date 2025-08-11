import { Redis } from "@upstash/redis";

export interface RateLimiterOptions {
  requests: number;
  window: number; // seconds
  keyPrefix?: string;
}

interface InMemoryEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private redis: Redis | null;
  private options: RateLimiterOptions;
  private inMemoryStore: Map<string, InMemoryEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(options: RateLimiterOptions) {
    this.options = options;

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

    // Clean up expired entries every minute when using in-memory fallback
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.inMemoryStore.entries()) {
      if (now >= entry.resetTime) {
        this.inMemoryStore.delete(key);
      }
    }
  }

  private checkInMemoryLimit(
    identifier: string,
  ): { allowed: boolean; remaining: number; resetIn: number } {
    const key = `${this.options.keyPrefix || "rate_limit"}:${identifier}`;
    const now = Date.now();
    const windowMs = this.options.window * 1000;
    
    let entry = this.inMemoryStore.get(key);
    
    // If entry doesn't exist or has expired, create a new one
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.inMemoryStore.set(key, entry);
      
      return {
        allowed: true,
        remaining: this.options.requests - 1,
        resetIn: Math.ceil(windowMs / 1000),
      };
    }
    
    // Increment the counter
    entry.count++;
    
    const allowed = entry.count <= this.options.requests;
    const remaining = Math.max(0, this.options.requests - entry.count);
    const resetIn = Math.ceil((entry.resetTime - now) / 1000);
    
    return {
      allowed,
      remaining,
      resetIn: Math.max(0, resetIn),
    };
  }

  async checkLimit(
    identifier: string,
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    // Use in-memory fallback if Redis is not available
    if (!this.redis) {
      return this.checkInMemoryLimit(identifier);
    }

    const key = `${this.options.keyPrefix || "rate_limit"}:${identifier}`;

    try {
      // Increment the counter
      const current = await this.redis.incr(key);

      // Set expiry on first request
      if (current === 1) {
        await this.redis.expire(key, this.options.window);
      }

      // Get TTL
      const ttl = await this.redis.ttl(key);

      const allowed = current <= this.options.requests;
      const remaining = Math.max(0, this.options.requests - current);

      return {
        allowed,
        remaining,
        resetIn: ttl > 0 ? ttl : 0,
      };
    } catch (_error) {
      // On error, allow the request
      return { allowed: true, remaining: this.options.requests, resetIn: 0 };
    }
  }

  async reset(identifier: string): Promise<void> {
    const key = `${this.options.keyPrefix || "rate_limit"}:${identifier}`;
    
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (_error) {}
    } else {
      // Reset in-memory entry
      this.inMemoryStore.delete(key);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.inMemoryStore.clear();
  }
}

// Utility function for distributed rate limiting across multiple services
export async function createDistributedRateLimiter(
  serviceName: string,
  options: Omit<RateLimiterOptions, "keyPrefix">,
): Promise<RateLimiter> {
  return new RateLimiter({
    ...options,
    keyPrefix: `rate_limit:${serviceName}`,
  });
}
