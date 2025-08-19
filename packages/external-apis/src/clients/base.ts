import { Redis } from "@upstash/redis";

export interface APIClientConfig {
  baseURL: string;
  apiKey?: string;
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
  cache?: {
    defaultTTL: number; // seconds
  };
}

export abstract class BaseAPIClient {
  protected baseURL: string;
  protected apiKey?: string;
  protected rateLimit?: { requests: number; window: number };
  protected cache: Redis;

  constructor(config: APIClientConfig) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey ?? undefined;
    this.rateLimit = config.rateLimit ?? undefined;
    this.cache = new Redis({
      url: process.env["UPSTASH_REDIS_REST_URL"]!,
      token: process.env["UPSTASH_REDIS_REST_TOKEN"]!,
    });
  }

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string,
    cacheTTL?: number,
  ): Promise<T> {
    // Check cache first
    if (cacheKey) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached as string) as T;
        } catch (e) {
          console.error(`Failed to parse cache for key ${cacheKey}:`, e);
          // Cache is corrupt, delete it and fetch fresh
          await this.cache.del(cacheKey);
        }
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

    // Cache successful responses
    if (cacheKey && cacheTTL) {
      await this.cache.setex(cacheKey, cacheTTL, JSON.stringify(data));
    }

    return data;
  }

  protected abstract getAuthHeaders(): Record<string, string>;

  private async checkRateLimit(): Promise<void> {
    if (!this.rateLimit) return;

    const key = `rate_limit:${this.constructor.name}`;
    const current = await this.cache.incr(key);

    if (current === 1) {
      await this.cache.expire(key, this.rateLimit.window);
    }

    if (current > this.rateLimit.requests) {
      const ttl = await this.cache.ttl(key);
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${ttl} seconds.`,
      );
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
