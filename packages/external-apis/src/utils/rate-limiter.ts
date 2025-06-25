import { Redis } from '@upstash/redis';

export interface RateLimiterOptions {
  requests: number;
  window: number; // seconds
  keyPrefix?: string;
}

export class RateLimiter {
  private redis: Redis | null;
  private options: RateLimiterOptions;

  constructor(options: RateLimiterOptions) {
    this.options = options;
    
    // Initialize Redis if environment variables are available
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    } else {
      this.redis = null;
    }
  }

  async checkLimit(identifier: string): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    if (!this.redis) {
      // If Redis is not available, always allow requests
      return { allowed: true, remaining: this.options.requests, resetIn: 0 };
    }

    const key = `${this.options.keyPrefix || 'rate_limit'}:${identifier}`;
    
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
    } catch (error) {
      console.error('Rate limiter error:', error);
      // On error, allow the request
      return { allowed: true, remaining: this.options.requests, resetIn: 0 };
    }
  }

  async reset(identifier: string): Promise<void> {
    if (!this.redis) return;

    const key = `${this.options.keyPrefix || 'rate_limit'}:${identifier}`;
    
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
    }
  }
}

// Utility function for distributed rate limiting across multiple services
export async function createDistributedRateLimiter(
  serviceName: string,
  options: Omit<RateLimiterOptions, 'keyPrefix'>
): Promise<RateLimiter> {
  return new RateLimiter({
    ...options,
    keyPrefix: `rate_limit:${serviceName}`,
  });
}