import { CacheManager } from "../utils/cache";
import { RateLimiter } from "../utils/rate-limiter";

export interface APIClientConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number; // milliseconds, default 10000
  retries?: {
    maxRetries: number;
    initialDelay: number; // milliseconds
    maxDelay: number; // milliseconds
    factor: number; // exponential backoff factor
  };
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
  protected timeout: number;
  protected retryConfig: Required<NonNullable<APIClientConfig['retries']>>;
  protected rateLimiter: RateLimiter | null;
  protected cache: CacheManager;

  constructor(config: APIClientConfig) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 10000; // 10s default timeout

    // Initialize retry configuration with defaults
    this.retryConfig = {
      maxRetries: config.retries?.maxRetries || 3,
      initialDelay: config.retries?.initialDelay || 1000,
      maxDelay: config.retries?.maxDelay || 30000,
      factor: config.retries?.factor || 2,
    };

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

    // Execute request with retry logic
    const data = await this.executeWithRetry<T>(endpoint, options);

    // Cache the result if key provided
    if (cacheKey && cacheTtl) {
      try {
        await this.cache.set(cacheKey, data, cacheTtl);
      } catch (_error) {
        // Log cache error but don't fail the request
        console.warn(`Failed to cache result for key: ${cacheKey}`);
      }
    }

    return data;
  }

  private async executeWithRetry<T>(
    endpoint: string,
    options: RequestInit,
    attempt = 1,
  ): Promise<T> {
    try {
      return await this.executeSingleRequest<T>(endpoint, options);
    } catch (error) {
      // Don't retry certain types of errors
      if (
        error instanceof RateLimitError ||
        error instanceof AuthenticationError ||
        (error instanceof APIError && error.statusCode >= 400 && error.statusCode < 500)
      ) {
        throw error;
      }

      // Check if we should retry
      if (attempt >= this.retryConfig.maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        this.retryConfig.initialDelay * Math.pow(this.retryConfig.factor, attempt - 1),
        this.retryConfig.maxDelay,
      );

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;

      console.warn(
        `Request to ${endpoint} failed (attempt ${attempt}/${this.retryConfig.maxRetries}). Retrying in ${Math.round(jitteredDelay)}ms...`,
        error instanceof Error ? error.message : String(error)
      );

      await this.sleep(jitteredDelay);
      return this.executeWithRetry<T>(endpoint, options, attempt + 1);
    }
  }

  private async executeSingleRequest<T>(
    endpoint: string,
    options: RequestInit,
  ): Promise<T> {
    // Ensure proper URL construction
    const baseUrl = this.baseURL.endsWith('/') ? this.baseURL : `${this.baseURL}/`;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const fullUrl = `${baseUrl}${cleanEndpoint}`;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(fullUrl, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TheSet/1.0.0 (External API Client)",
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response, endpoint);
      }

      const data = (await response.json()) as T;
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(`Request to ${endpoint} timed out after ${this.timeout}ms`);
      }

      throw error;
    }
  }

  private async handleErrorResponse(response: Response, endpoint: string): Promise<never> {
    const statusCode = response.status;
    const statusText = response.statusText;

    // Try to get error details from response body
    let errorDetails = '';
    try {
      const errorBody = await response.text();
      if (errorBody) {
        try {
          const parsedError = JSON.parse(errorBody);
          errorDetails = parsedError.message || parsedError.error || errorBody;
        } catch {
          errorDetails = errorBody;
        }
      }
    } catch {
      // Ignore errors reading response body
    }

    // Handle specific status codes
    if (statusCode === 401 || statusCode === 403) {
      throw new AuthenticationError(
        `Authentication failed: ${statusText}${errorDetails ? ` - ${errorDetails}` : ''}`,
        statusCode,
        endpoint,
      );
    }

    if (statusCode === 429) {
      const retryAfter = response.headers.get("Retry-After") || "60";
      throw new RateLimitError(
        `API rate limit exceeded. Retry after ${retryAfter} seconds.${errorDetails ? ` - ${errorDetails}` : ''}`,
      );
    }

    if (statusCode >= 500) {
      throw new ServerError(
        `Server error: ${statusCode} ${statusText}${errorDetails ? ` - ${errorDetails}` : ''}`,
        statusCode,
        endpoint,
      );
    }

    throw new APIError(
      `API request failed: ${statusCode} ${statusText}${errorDetails ? ` - ${errorDetails}` : ''}`,
      statusCode,
      endpoint,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected abstract getAuthHeaders(): Record<string, string>;

  // Convenience methods for common HTTP operations
  protected async get<T>(
    endpoint: string,
    params?: Record<string, string>,
    cacheKey?: string,
    cacheTtl?: number,
  ): Promise<T> {
    const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
    return this.makeRequest<T>(url, { method: 'GET' }, cacheKey, cacheTtl);
  }

  protected async post<T>(
    endpoint: string,
    data?: any,
    cacheKey?: string,
    cacheTtl?: number,
  ): Promise<T> {
    const options: RequestInit = {
      method: 'POST',
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }

    return this.makeRequest<T>(endpoint, options, cacheKey, cacheTtl);
  }

  protected async put<T>(
    endpoint: string,
    data?: any,
    cacheKey?: string,
    cacheTtl?: number,
  ): Promise<T> {
    const options: RequestInit = {
      method: 'PUT',
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }

    return this.makeRequest<T>(endpoint, options, cacheKey, cacheTtl);
  }

  protected async delete<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' });
  }

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

export class AuthenticationError extends APIError {
  constructor(message: string, statusCode: number, endpoint: string) {
    super(message, statusCode, endpoint);
    this.name = "AuthenticationError";
  }
}

export class ServerError extends APIError {
  constructor(message: string, statusCode: number, endpoint: string) {
    super(message, statusCode, endpoint);
    this.name = "ServerError";
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}
