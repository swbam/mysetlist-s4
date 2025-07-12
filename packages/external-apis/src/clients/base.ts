import { Redis } from '@upstash/redis';

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
  protected apiKey?: string | undefined;
  protected rateLimit?: { requests: number; window: number } | undefined;
  protected cache: Redis | null;

  constructor(config: APIClientConfig) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey;
    this.rateLimit = config.rateLimit;

    // Only initialize Redis if environment variables are available
    if (
      process.env['UPSTASH_REDIS_REST_URL'] &&
      process.env['UPSTASH_REDIS_REST_TOKEN']
    ) {
      this.cache = new Redis({
        url: process.env['UPSTASH_REDIS_REST_URL'],
        token: process.env['UPSTASH_REDIS_REST_TOKEN'],
      });
    } else {
      this.cache = null;
    }
  }

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string,
    cacheTtl?: number
  ): Promise<T> {
    // Check cache first if key provided and cache is available
    if (cacheKey && this.cache) {
      try {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          return JSON.parse(cached as string) as T;
        }
      } catch (_error) {
        // Cache miss or error, continue with API call
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
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new APIError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        endpoint
      );
    }

    const data = (await response.json()) as T;

    // Cache if key provided and cache is available
    if (cacheKey && cacheTtl && this.cache) {
      try {
        await this.cache.setex(cacheKey, cacheTtl, JSON.stringify(data));
      } catch (_error) {}
    }

    return data;
  }

  protected abstract getAuthHeaders(): Record<string, string>;

  protected async checkRateLimit(): Promise<void> {
    if (!this.rateLimit || !this.cache) {
      return;
    }

    const key = `rate_limit:${this.constructor.name}`;
    const current = await this.cache.incr(key);

    if (current === 1) {
      await this.cache.expire(key, this.rateLimit.window);
    }

    if (current > this.rateLimit.requests) {
      const ttl = await this.cache.ttl(key);
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${ttl} seconds.`
      );
    }
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}
