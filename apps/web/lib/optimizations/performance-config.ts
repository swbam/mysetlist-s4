/**
 * Performance Optimization Configuration
 * Implements parallel processing, bundle optimization, and performance monitoring
 */

import { cacheManager } from '../services/cache-manager';

// Performance Configuration Constants
export const PERFORMANCE_CONFIG = {
  // Parallel Processing
  BATCH_SIZES: {
    API_CALLS: 5,        // Concurrent API calls
    DATABASE_QUERIES: 10, // Concurrent DB operations
    IMAGE_PROCESSING: 3,  // Concurrent image operations
    SYNC_OPERATIONS: 2,   // Conservative for external APIs
  },
  
  // Rate Limiting
  RATE_LIMITS: {
    SPOTIFY_API: { requests: 100, window: 60 }, // per minute
    TICKETMASTER_API: { requests: 5000, window: 24 * 60 * 60 }, // per day
    SETLISTFM_API: { requests: 2, window: 1 }, // per second
  },
  
  // Timeouts
  TIMEOUTS: {
    API_REQUEST: 30000,    // 30 seconds
    DATABASE_QUERY: 10000, // 10 seconds
    CACHE_OPERATION: 5000, // 5 seconds
  },
  
  // Bundle Optimization
  BUNDLE_TARGETS: {
    HOMEPAGE: 350 * 1024,      // 350kB
    ARTIST_PAGE: 400 * 1024,   // 400kB
    SHOW_PAGE: 450 * 1024,     // 450kB
    ADMIN_PAGE: 800 * 1024,    // 800kB (admin can be larger)
  },
  
  // Cache Configuration
  CACHE_SETTINGS: {
    PREFETCH_THRESHOLD: 0.8,   // Prefetch when 80% of cache is hit
    WARM_CACHE_ON_DEPLOY: true,
    MAX_CACHE_SIZE: 100 * 1024 * 1024, // 100MB
  },
} as const;

// Performance Monitoring
interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  errorRate: number;
  throughput: number;
  timestamp: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000;
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  recordMetric(metric: Partial<PerformanceMetrics>): void {
    const fullMetric: PerformanceMetrics = {
      responseTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      errorRate: 0,
      throughput: 0,
      timestamp: Date.now(),
      ...metric,
    };
    
    this.metrics.push(fullMetric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }
  
  getAverageMetrics(timeWindowMs = 5 * 60 * 1000): PerformanceMetrics {
    const cutoff = Date.now() - timeWindowMs;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    if (recentMetrics.length === 0) {
      return {
        responseTime: 0,
        memoryUsage: 0,
        cacheHitRate: 0,
        errorRate: 0,
        throughput: 0,
        timestamp: Date.now(),
      };
    }
    
    const avg = recentMetrics.reduce(
      (acc, metric) => {
        acc.responseTime += metric.responseTime;
        acc.memoryUsage += metric.memoryUsage;
        acc.cacheHitRate += metric.cacheHitRate;
        acc.errorRate += metric.errorRate;
        acc.throughput += metric.throughput;
        return acc;
      },
      { responseTime: 0, memoryUsage: 0, cacheHitRate: 0, errorRate: 0, throughput: 0 }
    );
    
    const count = recentMetrics.length;
    return {
      responseTime: avg.responseTime / count,
      memoryUsage: avg.memoryUsage / count,
      cacheHitRate: avg.cacheHitRate / count,
      errorRate: avg.errorRate / count,
      throughput: avg.throughput / count,
      timestamp: Date.now(),
    };
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Parallel Processing Utilities
export class ParallelProcessor {
  /**
   * Process items in parallel with controlled concurrency
   */
  static async processInBatches<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = PERFORMANCE_CONFIG.BATCH_SIZES.API_CALLS,
    delayBetweenBatches: number = 1000
  ): Promise<R[]> {
    const results: R[] = [];
    const batches: T[][] = [];
    
    // Split into batches
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]!;
      const startTime = Date.now();
      
      try {
        // Process batch items in parallel
        const batchResults = await Promise.allSettled(
          batch.map(item => processor(item))
        );
        
        // Extract successful results
        const successfulResults = batchResults
          .filter(result => result.status === 'fulfilled')
          .map(result => (result as PromiseFulfilledResult<R>).value);
          
        results.push(...successfulResults);
        
        // Record performance metrics
        const processingTime = Date.now() - startTime;
        performanceMonitor.recordMetric({
          responseTime: processingTime,
          throughput: batch.length / (processingTime / 1000),
          errorRate: (batchResults.length - successfulResults.length) / batchResults.length,
        });
        
      } catch (error) {
        console.error(`Batch ${i + 1} processing failed:`, error);
        performanceMonitor.recordMetric({
          errorRate: 1,
          responseTime: Date.now() - startTime,
        });
      }
      
      // Delay between batches (except for last batch)
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    return results;
  }
  
  /**
   * Process with retry logic
   */
  static async processWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      
      try {
        const result = await operation();
        
        performanceMonitor.recordMetric({
          responseTime: Date.now() - startTime,
          errorRate: 0,
        });
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        performanceMonitor.recordMetric({
          responseTime: Date.now() - startTime,
          errorRate: 1,
        });
        
        if (attempt < maxRetries) {
          const delay = backoffMs * Math.pow(2, attempt); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }
}

// Rate Limiting
class RateLimiter {
  private windows = new Map<string, { count: number; resetTime: number }>();
  
  async checkLimit(
    key: string, 
    maxRequests: number, 
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const window = this.windows.get(key);
    
    // Create or reset window if expired
    if (!window || now >= window.resetTime) {
      this.windows.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowMs,
      };
    }
    
    // Check if limit exceeded
    if (window.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: window.resetTime,
      };
    }
    
    // Increment counter
    window.count++;
    
    return {
      allowed: true,
      remaining: maxRequests - window.count,
      resetAt: window.resetTime,
    };
  }
}

export const rateLimiter = new RateLimiter();

// Bundle Size Monitoring
export function checkBundleSize(bundleName: string, sizeBytes: number): {
  withinTarget: boolean;
  target: number;
  current: number;
  percentage: number;
} {
  const target = PERFORMANCE_CONFIG.BUNDLE_TARGETS[bundleName as keyof typeof PERFORMANCE_CONFIG.BUNDLE_TARGETS];
  
  if (!target) {
    console.warn(`No bundle target defined for: ${bundleName}`);
    return {
      withinTarget: true,
      target: 0,
      current: sizeBytes,
      percentage: 0,
    };
  }
  
  const percentage = (sizeBytes / target) * 100;
  
  return {
    withinTarget: sizeBytes <= target,
    target,
    current: sizeBytes,
    percentage,
  };
}

// Performance Timing Utilities
export class PerformanceTimer {
  private startTime: number;
  private label: string;
  
  constructor(label: string) {
    this.label = label;
    this.startTime = performance.now();
  }
  
  end(): number {
    const duration = performance.now() - this.startTime;
    
    performanceMonitor.recordMetric({
      responseTime: duration,
    });
    
    return duration;
  }
  
  static async measure<T>(
    label: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const timer = new PerformanceTimer(label);
    
    try {
      const result = await operation();
      const duration = timer.end();
      
      return { result, duration };
    } catch (error) {
      timer.end();
      throw error;
    }
  }
}

// Cache Warming Strategy
export class CacheWarmingStrategy {
  static async warmCriticalPaths(): Promise<void> {
    const cache = cacheManager;
    
    try {
      console.log('Starting cache warming for critical paths...');
      
      // Warm trending data
      await cache.warmCache('trending');
      
      // Warm popular artists
      await cache.warmCache('popular-artists');
      
      // Warm upcoming shows
      await cache.warmCache('upcoming-shows');
      
      console.log('Cache warming completed successfully');
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }
  
  static async prefetchUserData(userId: string): Promise<void> {
    // Prefetch user-specific data
    try {
      // This would fetch and cache user votes, preferences, etc.
      console.log(`Prefetching data for user: ${userId}`);
    } catch (error) {
      console.warn('User data prefetch failed:', error);
    }
  }
}

// Memory Management
export class MemoryManager {
  static getMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
  } {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        used: usage.heapUsed,
        total: usage.heapTotal,
        percentage: (usage.heapUsed / usage.heapTotal) * 100,
      };
    }
    
    return { used: 0, total: 0, percentage: 0 };
  }
  
  static shouldTriggerGC(): boolean {
    const memory = this.getMemoryUsage();
    return memory.percentage > 80; // Trigger when > 80% memory used
  }
  
  static async cleanupResources(): Promise<void> {
    // Clear expired cache entries
    // Close idle database connections
    // Clean up temporary files
    console.log('Performing resource cleanup...');
    
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }
  }
}

// All utilities are already exported above as class declarations

export default {
  config: PERFORMANCE_CONFIG,
  monitor: performanceMonitor,
  processor: ParallelProcessor,
  rateLimiter,
  timer: PerformanceTimer,
  cacheWarming: CacheWarmingStrategy,
  memory: MemoryManager,
};
