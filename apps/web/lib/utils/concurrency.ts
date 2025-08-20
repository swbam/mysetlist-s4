/**
 * Concurrency control utilities for bounded parallelism
 * Implements GROK.md specifications for high-throughput import operations
 */

// Re-export the main utilities from services
export {
  pLimit,
  processBatch,
  TaskQueue,
  parallelMap,
  parallelFilter,
  processInChunks,
  type PLimit
} from '../services/util/concurrency';

// Additional utility types and helpers
export interface ConcurrencyConfig {
  maxConcurrent: number;
  chunkSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Create a concurrency-limited async operation wrapper
 */
export function createLimitedProcessor<T, R>(
  processor: (item: T) => Promise<R>,
  config: ConcurrencyConfig
) {
  const { pLimit } = require('../services/util/concurrency');
  const limit = pLimit(config.maxConcurrent);

  return async (items: T[]): Promise<R[]> => {
    const promises = items.map(item => 
      limit(async () => {
        let attempts = 0;
        const maxAttempts = config.retryAttempts || 1;
        
        while (attempts < maxAttempts) {
          try {
            return await processor(item);
          } catch (error) {
            attempts++;
            if (attempts >= maxAttempts) {
              throw error;
            }
            
            // Wait before retry if configured
            if (config.retryDelay) {
              await new Promise(resolve => setTimeout(resolve, config.retryDelay));
            }
          }
        }
        
        throw new Error('Max attempts reached');
      })
    );
    
    return Promise.all(promises);
  };
}

/**
 * Rate-limited function wrapper
 */
export function rateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    maxCalls: number;
    timeWindow: number; // in milliseconds
  }
): T {
  const calls: number[] = [];
  
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const now = Date.now();
    
    // Remove calls outside the time window
    while (calls.length > 0 && calls[0]! < now - options.timeWindow) {
      calls.shift();
    }
    
    // Check if we've exceeded the rate limit
    if (calls.length >= options.maxCalls) {
      const oldestCall = calls[0]!;
      const waitTime = options.timeWindow - (now - oldestCall);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return rateLimit(fn, options)(...args);
    }
    
    calls.push(now);
    return await fn(...args);
  }) as T;
}

/**
 * Exponential backoff retry wrapper
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
  } = options;

  let attempt = 1;
  let delay = baseDelay;

  while (attempt <= maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelay);
      attempt++;
    }
  }

  throw new Error('Max attempts reached');
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker<T extends (...args: any[]) => Promise<any>> {
  private failureCount = 0;
  private lastFailureTime?: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private fn: T,
    private options: {
      failureThreshold: number;
      recoveryTimeout: number;
      monitoringPeriod?: number;
    }
  ) {}

  async execute(...args: Parameters<T>): Promise<ReturnType<T>> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await this.fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private shouldAttemptReset(): boolean {
    return (
      this.lastFailureTime !== undefined &&
      Date.now() - this.lastFailureTime >= this.options.recoveryTimeout
    );
  }

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = undefined;
  }
}