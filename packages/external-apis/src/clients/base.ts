import { CacheManager } from "../utils/cache";
import { RateLimiter } from "../utils/rate-limiter";

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
  protected rateLimiter: RateLimiter | null;
  protected cache: CacheManager;

  constructor(config: APIClientConfig) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey;

    // Initialize rate limiter if configured
    this.rateLimiter = config.rateLimit
      ? new RateLimiter({
          requests: config.rateLimit.requests,
          window: config.rateLimit.window,
          keyPrefix: this.constructor.name.toLowerCase(),
        })
      : null;

    // Initialize cache manager
    this.cache = new CacheManager({
      defaultTTL: config.cache?.defaultTTL || 3600,
      keyPrefix: this.constructor.name.toLowerCase(),
    });
  }

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string,
    cacheTtl?: number,
  ): Promise<T> {
    // Check cache first if key provided
    if (cacheKey) {
      try {
        const cached = await this.cache.get<T>(cacheKey);
        if (cached) {
          return cached;
        }
      } catch (_error) {
        // Cache miss or error, continue with API call
      }
    }

    // Check rate limits
    if (this.rateLimiter) {
      const rateCheck = await this.rateLimiter.checkLimit("global");
      if (!rateCheck.allowed) {
        throw new RateLimitError(
          `Rate limit exceeded. Try again in ${rateCheck.resetIn} seconds.`,
        );
      }
    }

    // Ensure proper URL construction
    const baseUrl = this.baseURL.endsWith('/') ? this.baseURL : `${this.baseURL}/`;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const fullUrl = `${baseUrl}${cleanEndpoint}`;
    
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Handle rate limit responses specifically
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After") || "60";
        throw new RateLimitError(
          `API rate limit exceeded. Retry after ${retryAfter} seconds.`,
        );
      }

      throw new APIError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        endpoint,
      );
    }

    const data = (await response.json()) as T;

    // Cache the result if key provided
    if (cacheKey && cacheTtl) {
      try {
        await this.cache.set(cacheKey, data, cacheTtl);
      } catch (_error) {}
    }

    return data;
  }

  protected abstract getAuthHeaders(): Record<string, string>;

  /**
   * Clean up resources when the client is no longer needed
   */
  destroy(): void {
    if (this.rateLimiter) {
      this.rateLimiter.destroy();
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
