/**
 * Base API Client with retry logic, rate limiting, and circuit breaker pattern
 * Provides foundation for all external API integrations
 */

import { fetchJson, fetchWithRetry, HttpError, type FetchRetryOptions } from '../util/http';

export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
  defaultHeaders?: Record<string, string>;
  rateLimitConfig?: {
    requestsPerSecond: number;
    burstSize: number;
  };
  retryConfig?: FetchRetryOptions;
  circuitBreaker?: {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringWindow: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  headers?: Record<string, string>;
  status: number;
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  limit: number;
}

export interface ApiHealthCheck {
  healthy: boolean;
  responseTime: number;
  rateLimit?: RateLimitInfo;
  error?: string;
}

// Circuit breaker states
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

interface CircuitBreakerData {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

/**
 * Base API client with advanced error handling, retry logic, and monitoring
 */
export class BaseApiClient {
  protected config: ApiClientConfig;
  private requestQueue: Array<() => Promise<any>> = [];
  private requestsInFlight = 0;
  private rateLimitTokens: number;
  private lastTokenRefill: number;
  private circuitBreaker: CircuitBreakerData;
  private requestMetrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  };

  constructor(config: ApiClientConfig) {
    this.config = {
      retryConfig: {
        tries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        retryOn: (response) => response.status === 429 || response.status >= 500,
        timeout: 30000,
      },
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 60000, // 1 minute
        monitoringWindow: 300000, // 5 minutes
      },
      ...config,
    };

    // Initialize rate limiting
    this.rateLimitTokens = this.config.rateLimitConfig?.burstSize || 10;
    this.lastTokenRefill = Date.now();

    // Initialize circuit breaker
    this.circuitBreaker = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
    };

    // Initialize metrics
    this.requestMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Make authenticated API request with full error handling
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit & {
      retryConfig?: FetchRetryOptions;
      skipCircuitBreaker?: boolean;
    } = {}
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    
    try {
      // Check circuit breaker
      if (!options.skipCircuitBreaker) {
        this.checkCircuitBreaker();
      }

      // Apply rate limiting
      await this.applyRateLimit();

      // Build full URL
      const url = this.buildUrl(endpoint);
      
      // Prepare headers
      const headers = this.buildHeaders(options.headers);
      
      // Prepare request options
      const requestOptions: RequestInit = {
        ...options,
        headers,
      };

      // Make request with retry logic
      const retryOptions = { ...this.config.retryConfig, ...options.retryConfig };
      const response = await fetchWithRetry(url, requestOptions, retryOptions);

      // Update metrics on success
      this.updateMetrics(true, Date.now() - startTime);
      this.onRequestSuccess();

      // Parse response
      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      return {
        data,
        headers: this.extractHeaders(response.headers),
        status: response.status,
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(false, responseTime);
      this.onRequestFailure();

      if (error instanceof HttpError) {
        throw error;
      }
      
      throw new HttpError(
        `API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        undefined,
        true
      );
    }
  }

  /**
   * GET request helper
   */
  protected async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
    options?: RequestInit & { retryConfig?: FetchRetryOptions }
  ): Promise<ApiResponse<T>> {
    const url = params ? this.addQueryParams(endpoint, params) : endpoint;
    
    return this.request<T>(url, {
      method: 'GET',
      ...options,
    });
  }

  /**
   * POST request helper
   */
  protected async post<T>(
    endpoint: string,
    body?: any,
    options?: RequestInit & { retryConfig?: FetchRetryOptions }
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  /**
   * Health check for the API
   */
  public async healthCheck(): Promise<ApiHealthCheck> {
    const startTime = Date.now();
    
    try {
      // Use a lightweight endpoint for health checks
      const response = await this.request<any>('/', {
        retryConfig: { tries: 1, timeout: 5000 },
        skipCircuitBreaker: true,
      });

      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        responseTime,
        rateLimit: this.extractRateLimitFromHeaders(response.headers),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current API metrics
   */
  public getMetrics() {
    return {
      ...this.requestMetrics,
      circuitBreaker: {
        state: this.circuitBreaker.state,
        failureCount: this.circuitBreaker.failureCount,
      },
      rateLimit: {
        tokensRemaining: this.rateLimitTokens,
        requestsInFlight: this.requestsInFlight,
      },
    };
  }

  /**
   * Reset circuit breaker (for manual recovery)
   */
  public resetCircuitBreaker(): void {
    this.circuitBreaker = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
    };
    console.log('Circuit breaker reset manually');
  }

  // Private helper methods

  private buildUrl(endpoint: string): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  }

  private buildHeaders(additionalHeaders?: HeadersInit): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'MySetlist-API-Client/1.0',
      ...this.config.defaultHeaders,
    };

    // Add API key if provided
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    // Add additional headers
    if (additionalHeaders) {
      const additionalHeadersRecord = this.headersToRecord(additionalHeaders);
      Object.assign(headers, additionalHeadersRecord);
    }

    return headers;
  }

  private headersToRecord(headers: HeadersInit): Record<string, string> {
    if (headers instanceof Headers) {
      const record: Record<string, string> = {};
      headers.forEach((value, key) => {
        record[key] = value;
      });
      return record;
    }
    
    if (Array.isArray(headers)) {
      const record: Record<string, string> = {};
      headers.forEach(([key, value]) => {
        record[key] = value;
      });
      return record;
    }

    return headers as Record<string, string>;
  }

  private addQueryParams(
    endpoint: string,
    params: Record<string, string | number | boolean>
  ): string {
    const url = new URL(endpoint, 'http://example.com'); // Base is ignored
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    return url.pathname + url.search;
  }

  private extractHeaders(headers: Headers): Record<string, string> {
    const extracted: Record<string, string> = {};
    headers.forEach((value, key) => {
      extracted[key] = value;
    });
    return extracted;
  }

  private extractRateLimitFromHeaders(headers?: Record<string, string>): RateLimitInfo | undefined {
    if (!headers) return undefined;

    const remaining = headers['x-ratelimit-remaining'] || headers['x-rate-limit-remaining'];
    const resetTime = headers['x-ratelimit-reset'] || headers['x-rate-limit-reset'];
    const limit = headers['x-ratelimit-limit'] || headers['x-rate-limit-limit'];

    if (remaining && resetTime && limit) {
      return {
        remaining: parseInt(remaining),
        resetTime: parseInt(resetTime),
        limit: parseInt(limit),
      };
    }

    return undefined;
  }

  // Rate limiting implementation
  private async applyRateLimit(): Promise<void> {
    if (!this.config.rateLimitConfig) return;

    const now = Date.now();
    const timeSinceRefill = now - this.lastTokenRefill;
    const tokensToAdd = Math.floor(
      (timeSinceRefill / 1000) * this.config.rateLimitConfig.requestsPerSecond
    );

    if (tokensToAdd > 0) {
      this.rateLimitTokens = Math.min(
        this.config.rateLimitConfig.burstSize,
        this.rateLimitTokens + tokensToAdd
      );
      this.lastTokenRefill = now;
    }

    if (this.rateLimitTokens <= 0) {
      const waitTime = 1000 / this.config.rateLimitConfig.requestsPerSecond;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.rateLimitTokens = 1;
    } else {
      this.rateLimitTokens--;
    }
  }

  // Circuit breaker implementation
  private checkCircuitBreaker(): void {
    const now = Date.now();

    switch (this.circuitBreaker.state) {
      case CircuitState.OPEN:
        if (now >= this.circuitBreaker.nextAttemptTime) {
          this.circuitBreaker.state = CircuitState.HALF_OPEN;
          console.log('Circuit breaker moved to HALF_OPEN state');
        } else {
          throw new HttpError(
            'Circuit breaker is OPEN - API temporarily unavailable',
            503,
            undefined,
            false,
            false
          );
        }
        break;

      case CircuitState.HALF_OPEN:
        // Allow one request through
        break;

      case CircuitState.CLOSED:
        // Normal operation
        break;
    }
  }

  private onRequestSuccess(): void {
    if (this.circuitBreaker.state === CircuitState.HALF_OPEN) {
      this.circuitBreaker.state = CircuitState.CLOSED;
      this.circuitBreaker.failureCount = 0;
      console.log('Circuit breaker moved to CLOSED state after successful request');
    }
  }

  private onRequestFailure(): void {
    const now = Date.now();
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = now;

    if (!this.config.circuitBreaker) return;

    if (this.circuitBreaker.failureCount >= this.config.circuitBreaker.failureThreshold) {
      this.circuitBreaker.state = CircuitState.OPEN;
      this.circuitBreaker.nextAttemptTime = now + this.config.circuitBreaker.recoveryTimeout;
      console.log(
        `Circuit breaker opened after ${this.circuitBreaker.failureCount} failures. ` +
        `Will attempt recovery at ${new Date(this.circuitBreaker.nextAttemptTime).toISOString()}`
      );
    }
  }

  private updateMetrics(success: boolean, responseTime: number): void {
    this.requestMetrics.totalRequests++;
    
    if (success) {
      this.requestMetrics.successfulRequests++;
    } else {
      this.requestMetrics.failedRequests++;
    }

    // Update average response time
    const totalResponseTime = this.requestMetrics.averageResponseTime * (this.requestMetrics.totalRequests - 1);
    this.requestMetrics.averageResponseTime = (totalResponseTime + responseTime) / this.requestMetrics.totalRequests;
  }
}