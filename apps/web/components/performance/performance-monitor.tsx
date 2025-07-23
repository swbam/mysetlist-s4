'use client';

import { useEffect, useCallback } from 'react';

/**
 * Performance Monitor Component
 * Tracks Core Web Vitals and other performance metrics
 */

interface PerformanceMetrics {
  // Core Web Vitals
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  
  // Additional metrics
  FCP?: number; // First Contentful Paint
  TTFB?: number; // Time to First Byte
  INP?: number; // Interaction to Next Paint
  
  // Custom metrics
  pageLoadTime?: number;
  domContentLoadedTime?: number;
  resourceLoadTime?: number;
  
  // Navigation timing
  navigationStart?: number;
  navigationEnd?: number;
  
  // Memory usage
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
}

interface PerformanceEntry extends PerformanceEntry {
  value?: number;
  delta?: number;
  id?: string;
  navigationType?: string;
}

class PerformanceTracker {
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];
  private reportingEndpoint = '/api/analytics/vitals';
  
  constructor() {
    this.initializeObservers();
  }

  private initializeObservers(): void {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint
    this.observeMetric('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        this.metrics.LCP = lastEntry.startTime;
        this.reportMetric('LCP', lastEntry.startTime);
      }
    });

    // First Input Delay
    this.observeMetric('first-input', (entries) => {
      const firstEntry = entries[0];
      if (firstEntry) {
        const fid = firstEntry.processingStart - firstEntry.startTime;
        this.metrics.FID = fid;
        this.reportMetric('FID', fid);
      }
    });

    // Cumulative Layout Shift
    let clsValue = 0;
    this.observeMetric('layout-shift', (entries) => {
      for (const entry of entries) {
        // Only count layout shifts that don't occur within 500ms of user interaction
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.metrics.CLS = clsValue;
      this.reportMetric('CLS', clsValue);
    });

    // First Contentful Paint
    this.observeMetric('paint', (entries) => {
      const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.metrics.FCP = fcpEntry.startTime;
        this.reportMetric('FCP', fcpEntry.startTime);
      }
    });

    // Navigation timing
    this.observeMetric('navigation', (entries) => {
      const navEntry = entries[0] as PerformanceNavigationTiming;
      if (navEntry) {
        this.metrics.TTFB = navEntry.responseStart - navEntry.requestStart;
        this.metrics.domContentLoadedTime = navEntry.domContentLoadedEventEnd - navEntry.navigationStart;
        this.metrics.pageLoadTime = navEntry.loadEventEnd - navEntry.navigationStart;
        
        this.reportMetric('TTFB', this.metrics.TTFB);
        this.reportMetric('domContentLoadedTime', this.metrics.domContentLoadedTime);
        this.reportMetric('pageLoadTime', this.metrics.pageLoadTime);
      }
    });

    // Long tasks (potential performance issues)
    this.observeMetric('longtask', (entries) => {
      for (const entry of entries) {
        if (entry.duration > 50) { // Tasks longer than 50ms
          console.warn('[Performance] Long task detected:', {
            duration: entry.duration,
            startTime: entry.startTime,
          });
          
          this.reportMetric('longTask', entry.duration, {
            startTime: entry.startTime,
          });
        }
      }
    });

    // Resource timing
    this.observeMetric('resource', (entries) => {
      const slowResources = entries.filter((entry) => {
        const duration = entry.responseEnd - entry.requestStart;
        return duration > 1000; // Resources taking more than 1 second
      });

      if (slowResources.length > 0) {
        console.warn('[Performance] Slow resources detected:', slowResources);
        
        slowResources.forEach((resource) => {
          this.reportMetric('slowResource', resource.responseEnd - resource.requestStart, {
            name: resource.name,
            type: (resource as PerformanceResourceTiming).initiatorType,
          });
        });
      }
    });

    // Memory usage monitoring
    this.monitorMemoryUsage();
    
    // Custom performance marks
    this.setupCustomMarks();
  }

  private observeMetric(
    entryType: string, 
    callback: (entries: PerformanceEntry[]) => void
  ): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      observer.observe({ entryTypes: [entryType] });
      this.observers.push(observer);
    } catch (error) {
      console.warn(`[Performance] Could not observe ${entryType}:`, error);
    }
  }

  private monitorMemoryUsage(): void {
    if (typeof window === 'undefined' || !('memory' in performance)) return;

    const checkMemory = () => {
      const memory = (performance as any).memory;
      if (memory) {
        this.metrics.usedJSHeapSize = memory.usedJSHeapSize;
        this.metrics.totalJSHeapSize = memory.totalJSHeapSize;
        this.metrics.jsHeapSizeLimit = memory.jsHeapSizeLimit;

        // Warn if memory usage is high
        const memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (memoryUsagePercent > 80) {
          console.warn('[Performance] High memory usage:', {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            usagePercent: memoryUsagePercent,
          });
          
          this.reportMetric('highMemoryUsage', memoryUsagePercent);
        }
      }
    };

    // Check memory usage every 30 seconds
    setInterval(checkMemory, 30000);
    checkMemory(); // Initial check
  }

  private setupCustomMarks(): void {
    // Mark when React hydration completes
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        performance.mark('react-hydration-complete');
      });
    }
  }

  private reportMetric(name: string, value: number, metadata?: Record<string, any>): void {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.pathname,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType(),
      deviceType: this.getDeviceType(),
      ...metadata,
    };

    // Send to analytics endpoint
    this.sendToAnalytics(metric);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}:`, value, metadata);
    }
  }

  private async sendToAnalytics(metric: any): Promise<void> {
    try {
      // Use sendBeacon for better reliability
      if ('sendBeacon' in navigator) {
        navigator.sendBeacon(
          this.reportingEndpoint,
          JSON.stringify(metric)
        );
      } else {
        // Fallback to fetch
        fetch(this.reportingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metric),
          keepalive: true,
        }).catch((error) => {
          console.warn('[Performance] Failed to send metric:', error);
        });
      }
    } catch (error) {
      console.warn('[Performance] Analytics reporting failed:', error);
    }
  }

  private getConnectionType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType || 'unknown';
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    
    return 'desktop';
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public markFeatureUsage(featureName: string, metadata?: Record<string, any>): void {
    performance.mark(`feature-${featureName}`);
    this.reportMetric('featureUsage', 1, {
      feature: featureName,
      ...metadata,
    });
  }

  public measureUserInteraction(interactionType: string, duration: number): void {
    this.reportMetric('userInteraction', duration, {
      type: interactionType,
    });
  }

  public disconnect(): void {
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers = [];
  }
}

// Global performance tracker instance
let performanceTracker: PerformanceTracker | null = null;

export function PerformanceMonitor(): null {
  const initializeTracker = useCallback(() => {
    if (typeof window !== 'undefined' && !performanceTracker) {
      performanceTracker = new PerformanceTracker();
    }
  }, []);

  const cleanupTracker = useCallback(() => {
    if (performanceTracker) {
      performanceTracker.disconnect();
      performanceTracker = null;
    }
  }, []);

  useEffect(() => {
    initializeTracker();
    
    return cleanupTracker;
  }, [initializeTracker, cleanupTracker]);

  // This component doesn't render anything
  return null;
}

// Utility hooks and functions for performance monitoring
export function usePerformanceMonitor() {
  const markFeature = useCallback((featureName: string, metadata?: Record<string, any>) => {
    if (performanceTracker) {
      performanceTracker.markFeatureUsage(featureName, metadata);
    }
  }, []);

  const measureInteraction = useCallback((interactionType: string, duration: number) => {
    if (performanceTracker) {
      performanceTracker.measureUserInteraction(interactionType, duration);
    }
  }, []);

  const getMetrics = useCallback(() => {
    return performanceTracker?.getMetrics() || {};
  }, []);

  return {
    markFeature,
    measureInteraction,
    getMetrics,
  };
}

// Higher-order component for tracking component performance
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: P) {
    const { markFeature } = usePerformanceMonitor();

    useEffect(() => {
      const startTime = performance.now();
      markFeature('componentMount', { component: componentName });

      return () => {
        const endTime = performance.now();
        const mountDuration = endTime - startTime;
        
        if (performanceTracker) {
          performanceTracker.measureUserInteraction('componentLifetime', mountDuration);
        }
      };
    }, [markFeature]);

    return <WrappedComponent {...props} />;
  };
}

// Performance budget checker
export function checkPerformanceBudget(metrics: PerformanceMetrics): {
  passed: boolean;
  failures: string[];
} {
  const budget = {
    LCP: 2500, // 2.5 seconds
    FID: 100,  // 100 milliseconds
    CLS: 0.1,  // 0.1
    FCP: 1800, // 1.8 seconds
    TTFB: 600, // 600 milliseconds
  };

  const failures: string[] = [];

  Object.entries(budget).forEach(([metric, threshold]) => {
    const value = metrics[metric as keyof PerformanceMetrics];
    if (value && value > threshold) {
      failures.push(`${metric}: ${value} > ${threshold}`);
    }
  });

  return {
    passed: failures.length === 0,
    failures,
  };
}