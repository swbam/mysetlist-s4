// MySetlist-S4 Batch API Optimizer
// File: apps/web/lib/services/batch-api-optimizer.ts
// Intelligent batching for external API calls with rate limit awareness

import { Queue } from 'bullmq';
import { cacheManager } from '../cache/cache-manager';
import { CircuitBreaker } from './circuit-breaker';

export interface BatchRequest<T = any> {
  id: string;
  type: 'spotify' | 'ticketmaster' | 'setlistfm';
  operation: string;
  params: any;
  priority?: number;
  resolver: (result: T) => void;
  rejecter: (error: Error) => void;
  timestamp: number;
}

export interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number; // milliseconds
  rateLimit: {
    requests: number;
    window: number; // milliseconds
  };
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

export interface BatchResult<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: Error;
  cached?: boolean;
}

export class BatchApiOptimizer {
  private static instances: Map<string, BatchApiOptimizer> = new Map();
  
  private pendingRequests: Map<string, BatchRequest[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private rateLimitCounters: Map<string, { count: number; resetTime: number }> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  
  private config: Record<string, BatchConfig> = {
    spotify: {
      maxBatchSize: 50, // Spotify allows 50 IDs per request
      maxWaitTime: 100, // 100ms max wait
      rateLimit: {
        requests: 180,
        window: 60000, // 1 minute
      },
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000,
      },
    },
    ticketmaster: {
      maxBatchSize: 20, // Conservative for Ticketmaster
      maxWaitTime: 200,
      rateLimit: {
        requests: 5000,
        window: 86400000, // 24 hours
      },
      retryPolicy: {
        maxRetries: 2,
        backoffMultiplier: 3,
        initialDelay: 2000,
      },
    },
    setlistfm: {
      maxBatchSize: 1, // SetlistFM doesn't support batching
      maxWaitTime: 50,
      rateLimit: {
        requests: 2,
        window: 1000, // 2 per second
      },
      retryPolicy: {
        maxRetries: 2,
        backoffMultiplier: 2,
        initialDelay: 500,
      },
    },
  };

  private constructor() {
    // Initialize circuit breakers
    this.circuitBreakers.set('spotify', new CircuitBreaker('Spotify API', {
      failureThreshold: 5,
      resetTimeout: 30000,
      monitoringPeriod: 60000,
    }));
    
    this.circuitBreakers.set('ticketmaster', new CircuitBreaker('Ticketmaster API', {
      failureThreshold: 3,
      resetTimeout: 60000,
      monitoringPeriod: 300000,
    }));
    
    this.circuitBreakers.set('setlistfm', new CircuitBreaker('SetlistFM API', {
      failureThreshold: 3,
      resetTimeout: 30000,
      monitoringPeriod: 120000,
    }));
  }

  static getInstance(): BatchApiOptimizer {
    const key = 'default';
    if (!BatchApiOptimizer.instances.has(key)) {
      BatchApiOptimizer.instances.set(key, new BatchApiOptimizer());
    }
    return BatchApiOptimizer.instances.get(key)!;
  }

  /**
   * Add a request to the batch queue
   */
  async request<T>(
    type: 'spotify' | 'ticketmaster' | 'setlistfm',
    operation: string,
    params: any,
    options: { priority?: number; cacheKey?: string } = {}
  ): Promise<T> {
    // Check cache first if key provided
    if (options.cacheKey) {
      const cached = await cacheManager.get<T>(
        options.cacheKey,
        undefined,
        { namespace: `api:${type}`, ttl: 3600 }
      );
      
      if (cached !== null) {
        console.log(`✅ Cache hit for ${type}:${operation} key: ${options.cacheKey}`);
        return cached;
      }
    }

    // Check rate limit
    if (!this.checkRateLimit(type)) {
      throw new Error(`Rate limit exceeded for ${type}`);
    }

    // Create promise for this request
    return new Promise<T>((resolve, reject) => {
      const request: BatchRequest<T> = {
        id: `${type}:${operation}:${Date.now()}:${Math.random()}`,
        type,
        operation,
        params,
        priority: options.priority || 5,
        resolver: resolve,
        rejecter: reject,
        timestamp: Date.now(),
      };

      // Add to pending requests
      const key = `${type}:${operation}`;
      if (!this.pendingRequests.has(key)) {
        this.pendingRequests.set(key, []);
      }
      
      const requests = this.pendingRequests.get(key)!;
      requests.push(request);
      
      // Sort by priority (higher priority first)
      requests.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      // Check if we should process immediately
      const config = this.config[type];
      if (requests.length >= config.maxBatchSize) {
        this.processBatch(key);
      } else {
        // Schedule batch processing
        this.scheduleBatch(key);
      }
    });
  }

  /**
   * Process a batch of requests
   */
  private async processBatch(key: string): Promise<void> {
    // Clear any existing timer
    const timer = this.batchTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(key);
    }

    // Get pending requests
    const requests = this.pendingRequests.get(key);
    if (!requests || requests.length === 0) {
      return;
    }

    // Extract batch based on config
    const [type] = key.split(':') as ['spotify' | 'ticketmaster' | 'setlistfm'];
    const config = this.config[type];
    const batch = requests.splice(0, config.maxBatchSize);
    
    if (requests.length === 0) {
      this.pendingRequests.delete(key);
    }

    console.log(`📦 Processing batch of ${batch.length} ${type} requests`);

    // Get circuit breaker
    const circuitBreaker = this.circuitBreakers.get(type)!;

    try {
      // Execute batch through circuit breaker
      const results = await circuitBreaker.execute(() => 
        this.executeBatch(type, batch)
      );

      // Process results
      for (let i = 0; i < batch.length; i++) {
        const request = batch[i];
        const result = results[i];
        
        if (result.success) {
          // Cache successful results
          const cacheKey = this.buildCacheKey(request);
          if (cacheKey) {
            await cacheManager.set(
              cacheKey,
              result.data,
              { namespace: `api:${type}`, ttl: 3600 }
            );
          }
          
          request.resolver(result.data);
        } else {
          request.rejecter(result.error || new Error('Request failed'));
        }
      }
      
      // Update rate limit counter
      this.incrementRateLimit(type, batch.length);

    } catch (error) {
      console.error(`Batch processing failed for ${key}:`, error);
      
      // Reject all requests in the batch
      for (const request of batch) {
        request.rejecter(error as Error);
      }
      
      // Retry logic
      if (this.shouldRetry(batch[0])) {
        console.log(`🔄 Retrying batch for ${key}`);
        await this.retryBatch(batch);
      }
    }

    // Process next batch if any
    if (this.pendingRequests.has(key)) {
      this.scheduleBatch(key);
    }
  }

  /**
   * Execute the actual batch API call
   */
  private async executeBatch(
    type: 'spotify' | 'ticketmaster' | 'setlistfm',
    batch: BatchRequest[]
  ): Promise<BatchResult[]> {
    switch (type) {
      case 'spotify':
        return this.executeSpotifyBatch(batch);
      
      case 'ticketmaster':
        return this.executeTicketmasterBatch(batch);
      
      case 'setlistfm':
        return this.executeSetlistFmBatch(batch);
      
      default:
        throw new Error(`Unknown API type: ${type}`);
    }
  }

  /**
   * Execute Spotify batch request
   */
  private async executeSpotifyBatch(batch: BatchRequest[]): Promise<BatchResult[]> {
    // Group by operation type
    const operationGroups = new Map<string, BatchRequest[]>();
    
    for (const request of batch) {
      const { operation } = request;
      if (!operationGroups.has(operation)) {
        operationGroups.set(operation, []);
      }
      operationGroups.get(operation)!.push(request);
    }

    const results: BatchResult[] = [];

    // Process each operation group
    for (const [operation, requests] of operationGroups) {
      try {
        switch (operation) {
          case 'getTracks': {
            const ids = requests.map(r => r.params.id).join(',');
            // In production, make actual API call here
            const mockData = requests.map(r => ({
              id: r.params.id,
              name: `Track ${r.params.id}`,
              // ... other track data
            }));
            
            for (let i = 0; i < requests.length; i++) {
              results.push({
                id: requests[i].id,
                success: true,
                data: mockData[i],
              });
            }
            break;
          }
          
          case 'getArtists': {
            const ids = requests.map(r => r.params.id).join(',');
            // In production, make actual API call here
            const mockData = requests.map(r => ({
              id: r.params.id,
              name: `Artist ${r.params.id}`,
              // ... other artist data
            }));
            
            for (let i = 0; i < requests.length; i++) {
              results.push({
                id: requests[i].id,
                success: true,
                data: mockData[i],
              });
            }
            break;
          }
          
          default:
            // Fallback for unknown operations
            for (const request of requests) {
              results.push({
                id: request.id,
                success: false,
                error: new Error(`Unknown Spotify operation: ${operation}`),
              });
            }
        }
      } catch (error) {
        // Mark all requests in this group as failed
        for (const request of requests) {
          results.push({
            id: request.id,
            success: false,
            error: error as Error,
          });
        }
      }
    }

    return results;
  }

  /**
   * Execute Ticketmaster batch request
   */
  private async executeTicketmasterBatch(batch: BatchRequest[]): Promise<BatchResult[]> {
    // Ticketmaster doesn't support true batching, but we can optimize by
    // making parallel requests within rate limits
    const results: BatchResult[] = [];
    const parallelLimit = 5; // Max parallel requests

    for (let i = 0; i < batch.length; i += parallelLimit) {
      const chunk = batch.slice(i, i + parallelLimit);
      
      const chunkResults = await Promise.all(
        chunk.map(async (request) => {
          try {
            // In production, make actual API call here
            const mockData = {
              id: request.params.id,
              name: `Event ${request.params.id}`,
              // ... other event data
            };
            
            return {
              id: request.id,
              success: true,
              data: mockData,
            };
          } catch (error) {
            return {
              id: request.id,
              success: false,
              error: error as Error,
            };
          }
        })
      );
      
      results.push(...chunkResults);
      
      // Add small delay between chunks to respect rate limits
      if (i + parallelLimit < batch.length) {
        await this.delay(200);
      }
    }

    return results;
  }

  /**
   * Execute SetlistFM batch request
   */
  private async executeSetlistFmBatch(batch: BatchRequest[]): Promise<BatchResult[]> {
    // SetlistFM requires sequential requests due to strict rate limits
    const results: BatchResult[] = [];

    for (const request of batch) {
      try {
        // In production, make actual API call here
        const mockData = {
          id: request.params.id,
          artist: `Artist ${request.params.artistId}`,
          // ... other setlist data
        };
        
        results.push({
          id: request.id,
          success: true,
          data: mockData,
        });

        // Respect rate limit (2 per second)
        await this.delay(500);
        
      } catch (error) {
        results.push({
          id: request.id,
          success: false,
          error: error as Error,
        });
      }
    }

    return results;
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatch(key: string): void {
    // Don't schedule if already scheduled
    if (this.batchTimers.has(key)) {
      return;
    }

    const [type] = key.split(':') as ['spotify' | 'ticketmaster' | 'setlistfm'];
    const config = this.config[type];

    const timer = setTimeout(() => {
      this.processBatch(key);
    }, config.maxWaitTime);

    this.batchTimers.set(key, timer);
  }

  /**
   * Check rate limit
   */
  private checkRateLimit(type: string): boolean {
    const config = this.config[type];
    const counter = this.rateLimitCounters.get(type) || { count: 0, resetTime: 0 };
    const now = Date.now();

    // Reset counter if window expired
    if (now >= counter.resetTime) {
      counter.count = 0;
      counter.resetTime = now + config.rateLimit.window;
      this.rateLimitCounters.set(type, counter);
    }

    return counter.count < config.rateLimit.requests;
  }

  /**
   * Increment rate limit counter
   */
  private incrementRateLimit(type: string, count: number = 1): void {
    const counter = this.rateLimitCounters.get(type) || { count: 0, resetTime: Date.now() + this.config[type].rateLimit.window };
    counter.count += count;
    this.rateLimitCounters.set(type, counter);
  }

  /**
   * Check if request should be retried
   */
  private shouldRetry(request: BatchRequest): boolean {
    const retries = (request as any).retries || 0;
    const config = this.config[request.type];
    return retries < config.retryPolicy.maxRetries;
  }

  /**
   * Retry a batch of requests
   */
  private async retryBatch(batch: BatchRequest[]): Promise<void> {
    const firstRequest = batch[0];
    const config = this.config[firstRequest.type];
    const retries = ((firstRequest as any).retries || 0) + 1;
    
    // Calculate delay with exponential backoff
    const delay = config.retryPolicy.initialDelay * Math.pow(config.retryPolicy.backoffMultiplier, retries - 1);
    
    await this.delay(delay);

    // Re-add to queue with updated retry count
    for (const request of batch) {
      (request as any).retries = retries;
      this.request(
        request.type,
        request.operation,
        request.params,
        { priority: request.priority }
      ).then(request.resolver).catch(request.rejecter);
    }
  }

  /**
   * Build cache key for a request
   */
  private buildCacheKey(request: BatchRequest): string | null {
    const { type, operation, params } = request;
    
    // Create a deterministic key based on request parameters
    const paramKey = Object.keys(params)
      .sort()
      .map(k => `${k}:${params[k]}`)
      .join(':');
    
    return `${type}:${operation}:${paramKey}`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current statistics
   */
  getStatistics(): {
    pendingRequests: { [key: string]: number };
    rateLimits: { [key: string]: { used: number; total: number; resetIn: number } };
    circuitBreakers: { [key: string]: string };
  } {
    const stats = {
      pendingRequests: {} as { [key: string]: number },
      rateLimits: {} as { [key: string]: { used: number; total: number; resetIn: number } },
      circuitBreakers: {} as { [key: string]: string },
    };

    // Pending requests
    for (const [key, requests] of this.pendingRequests) {
      stats.pendingRequests[key] = requests.length;
    }

    // Rate limits
    for (const [type, counter] of this.rateLimitCounters) {
      const config = this.config[type];
      const now = Date.now();
      stats.rateLimits[type] = {
        used: counter.count,
        total: config.rateLimit.requests,
        resetIn: Math.max(0, counter.resetTime - now),
      };
    }

    // Circuit breakers
    for (const [type, breaker] of this.circuitBreakers) {
      stats.circuitBreakers[type] = breaker.getState();
    }

    return stats;
  }

  /**
   * Clear all pending requests
   */
  clearPendingRequests(type?: string): void {
    if (type) {
      // Clear specific type
      for (const [key, requests] of this.pendingRequests) {
        if (key.startsWith(type)) {
          for (const request of requests) {
            request.rejecter(new Error('Request cancelled'));
          }
          this.pendingRequests.delete(key);
          
          const timer = this.batchTimers.get(key);
          if (timer) {
            clearTimeout(timer);
            this.batchTimers.delete(key);
          }
        }
      }
    } else {
      // Clear all
      for (const [key, requests] of this.pendingRequests) {
        for (const request of requests) {
          request.rejecter(new Error('Request cancelled'));
        }
      }
      
      for (const timer of this.batchTimers.values()) {
        clearTimeout(timer);
      }
      
      this.pendingRequests.clear();
      this.batchTimers.clear();
    }
  }
}

// Export singleton instance
export const batchApiOptimizer = BatchApiOptimizer.getInstance();
