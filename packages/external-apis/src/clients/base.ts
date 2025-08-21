import { Redis } from "@upstash/redis";

export interface APIClientConfig {
  baseURL: string;
  apiKey?: string | undefined;
  rateLimit?: {
    requests: number;
    window: number; // seconds
  } | undefined;
  cache?: {
    defaultTTL: number; // seconds
  } | undefined;
}

export abstract class BaseAPIClient {
  protected baseURL: string;
  protected apiKey: string | undefined;
  protected rateLimit: { requests: number; window: number } | undefined;
  protected cache: Redis | any;

  constructor(config: APIClientConfig) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey ?? undefined;
    this.rateLimit = config.rateLimit ?? undefined;
    // Use Upstash Redis as configured in environment with error handling
    try {
      this.cache = new Redis({
        url: process.env["UPSTASH_REDIS_REST_URL"]!,
        token: process.env["UPSTASH_REDIS_REST_TOKEN"]!,
      });
    } catch (error) {
      console.warn("Redis connection failed, continuing without cache:", error);
      // Create a mock cache that doesn't throw errors
      this.cache = {
        get: async () => null,
        set: async () => {},
        del: async () => {},
        incr: async () => 1,
        expire: async () => {},
        ttl: async () => -1,
      } as any;
    }
  }

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string,
    cacheTTL?: number,
  ): Promise<T> {
    // Check cache first (with error handling)
    if (cacheKey) {
      try {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          try {
            return typeof cached === 'string' ? JSON.parse(cached) as T : cached as T;
          } catch (e) {
            console.error(`Failed to parse cache for key ${cacheKey}:`, e);
            // Cache is corrupt, delete it and fetch fresh
            try {
              await this.cache.del(cacheKey);
            } catch (delError) {
              console.warn("Failed to delete corrupt cache:", delError);
            }
          }
        }
      } catch (cacheError) {
        console.warn("Cache get operation failed, continuing without cache:", cacheError);
      }
    }

    // Check rate limits
    if (this.rateLimit) {
      await this.checkRateLimit();
    }

    const url = new URL(endpoint, this.baseURL);
    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new APIError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        endpoint,
      );
    }

    const data = (await response.json()) as T;

    // Cache successful responses (with error handling)
    if (cacheKey && cacheTTL) {
      try {
        await this.cache.set(cacheKey, JSON.stringify(data), { ex: cacheTTL });
      } catch (cacheError) {
        console.warn("Cache set operation failed, continuing without cache:", cacheError);
      }
    }

    return data;
  }

  protected abstract getAuthHeaders(): Record<string, string>;

  private async checkRateLimit(): Promise<void> {
    if (!this.rateLimit) return;

    try {
      const key = `rate_limit:${this.constructor.name}`;
      const current = await this.cache.incr(key);

      if (current === 1) {
        await this.cache.expire(key, this.rateLimit.window);
      }

      if (current > this.rateLimit.requests) {
        const ttl = await this.cache.ttl(key);
        throw new RateLimitError(
          `Rate limit exceeded. Try again in ${ttl || 60} seconds.`,
        );
      }
    } catch (error) {
      // If rate limiting fails, just log and continue
      console.warn("Rate limiting failed, continuing without rate limit:", error);
    }
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}
