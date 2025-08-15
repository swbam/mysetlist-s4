/**
 * Advanced HTTP utilities with retry, exponential backoff, jitter, and proper error handling
 * Implements GROK.md specifications for robust API communication
 */

export interface FetchRetryOptions {
  tries?: number;
  baseDelay?: number;
  maxDelay?: number;
  jitter?: boolean;
  retryOn?: (response: Response) => boolean;
  retryOnNetworkError?: boolean;
  timeout?: number;
}

export class HttpError extends Error {
  public status?: number;
  public response?: Response;
  public isNetworkError: boolean;
  public isTimeout: boolean;

  constructor(
    message: string,
    status?: number,
    response?: Response,
    isNetworkError: boolean = false,
    isTimeout: boolean = false
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.response = response;
    this.isNetworkError = isNetworkError;
    this.isTimeout = isTimeout;
  }
}

/**
 * Advanced fetch with retry, exponential backoff, jitter, and proper 429/5xx handling
 * Based on GROK.md specifications for production-ready HTTP operations
 */
export async function fetchJson<T = any>(
  url: string,
  init: RequestInit = {},
  options: FetchRetryOptions = {}
): Promise<T> {
  const {
    tries = 3,
    baseDelay = 400,
    maxDelay = 30000,
    jitter = true,
    retryOn = (response) => response.status === 429 || response.status >= 500,
    retryOnNetworkError = true,
    timeout = 30000,
  } = options;

  let lastError: HttpError | undefined;
  
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      // Create controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const finalInit: RequestInit = {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...init.headers,
        },
      };

      let response: Response;
      
      try {
        response = await fetch(url, finalInit);
        clearTimeout(timeoutId);
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new HttpError(`Request timeout after ${timeout}ms`, undefined, undefined, false, true);
        }
        
        // Network error - retry if enabled
        if (retryOnNetworkError && attempt < tries - 1) {
          const delay = calculateDelay(attempt, baseDelay, maxDelay, jitter);
          await sleep(delay);
          continue;
        }
        
        throw new HttpError(`Network error: ${error.message}`, undefined, undefined, true);
      }

      // Check if we should retry based on status
      if (retryOn(response) && attempt < tries - 1) {
        const delay = calculateDelay(attempt, baseDelay, maxDelay, jitter);
        await sleep(delay);
        continue;
      }

      // Handle non-ok responses
      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorBody = await response.text();
          errorMessage = `HTTP ${response.status}: ${errorBody || response.statusText}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new HttpError(errorMessage, response.status, response);
      }

      // Parse JSON response
      try {
        return await response.json();
      } catch (error) {
        throw new HttpError('Invalid JSON response', response.status, response);
      }

    } catch (error: any) {
      lastError = error instanceof HttpError ? error : new HttpError(error.message);
      
      // Don't retry on the last attempt
      if (attempt === tries - 1) {
        break;
      }
      
      // Don't retry certain errors
      if (error instanceof HttpError && 
          error.status && 
          error.status >= 400 && 
          error.status < 500 && 
          error.status !== 429) {
        break;
      }
    }
  }

  throw lastError || new HttpError('Unknown error occurred');
}

/**
 * Simplified fetch wrapper for non-JSON responses
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  options: FetchRetryOptions = {}
): Promise<Response> {
  const {
    tries = 3,
    baseDelay = 400,
    maxDelay = 30000,
    jitter = true,
    retryOn = (response) => response.status === 429 || response.status >= 500,
    retryOnNetworkError = true,
    timeout = 30000,
  } = options;

  let lastError: HttpError | undefined;
  
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const finalInit: RequestInit = {
        ...init,
        signal: controller.signal,
      };

      let response: Response;
      
      try {
        response = await fetch(url, finalInit);
        clearTimeout(timeoutId);
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new HttpError(`Request timeout after ${timeout}ms`, undefined, undefined, false, true);
        }
        
        if (retryOnNetworkError && attempt < tries - 1) {
          const delay = calculateDelay(attempt, baseDelay, maxDelay, jitter);
          await sleep(delay);
          continue;
        }
        
        throw new HttpError(`Network error: ${error.message}`, undefined, undefined, true);
      }

      // Check if we should retry based on status
      if (retryOn(response) && attempt < tries - 1) {
        const delay = calculateDelay(attempt, baseDelay, maxDelay, jitter);
        await sleep(delay);
        continue;
      }

      return response;

    } catch (error: any) {
      lastError = error instanceof HttpError ? error : new HttpError(error.message);
      
      if (attempt === tries - 1) {
        break;
      }
      
      if (error instanceof HttpError && 
          error.status && 
          error.status >= 400 && 
          error.status < 500 && 
          error.status !== 429) {
        break;
      }
    }
  }

  throw lastError || new HttpError('Unknown error occurred');
}

/**
 * Calculate exponential backoff delay with optional jitter
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number, jitter: boolean): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  
  if (jitter) {
    // Add random jitter up to 25% of the delay
    const jitterAmount = cappedDelay * 0.25 * Math.random();
    return cappedDelay + jitterAmount;
  }
  
  return cappedDelay;
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rate limit aware fetch for APIs with known rate limits
 */
export async function fetchWithRateLimit<T = any>(
  url: string,
  init: RequestInit = {},
  rateLimitConfig?: {
    requestsPerSecond?: number;
    burstSize?: number;
  }
): Promise<T> {
  // Implementation would include rate limiting logic
  // For now, delegate to fetchJson with appropriate retry config
  return fetchJson<T>(url, init, {
    tries: 5,
    baseDelay: 1000,
    maxDelay: 60000,
    retryOn: (response) => response.status === 429 || response.status >= 500,
  });
}

/**
 * Batch fetch utility for multiple requests with concurrency control
 */
export async function batchFetch<T = any>(
  requests: Array<{ url: string; init?: RequestInit }>,
  options: {
    concurrency?: number;
    retryOptions?: FetchRetryOptions;
  } = {}
): Promise<Array<T | Error>> {
  const { concurrency = 5, retryOptions } = options;
  
  // This would use the concurrency utility we'll implement next
  // For now, basic implementation
  const results: Array<T | Error> = [];
  
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchPromises = batch.map(async ({ url, init }) => {
      try {
        return await fetchJson<T>(url, init, retryOptions);
      } catch (error) {
        return error as Error;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}