import { Sentry } from './sentry';

interface MetricData {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp?: number;
}

interface PerformanceMetric {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  metadata?: Record<string, any>;
}

/**
 * Comprehensive monitoring service for production
 */
export class MonitoringService {
  private static metrics: Map<string, PerformanceMetric> = new Map();
  private static customMetrics: MetricData[] = [];

  /**
   * Start performance measurement
   */
  static startMeasurement(name: string, metadata?: Record<string, any>): void {
    const startTime = performance.now();

    this.metrics.set(name, {
      name,
      duration: 0,
      startTime,
      endTime: 0,
      metadata,
    });

    // Mark performance start
    if (typeof performance !== 'undefined' && 'mark' in performance) {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * End performance measurement and track result
   */
  static endMeasurement(name: string): number {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`No measurement started for: ${name}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    // Update metric
    metric.endTime = endTime;
    metric.duration = duration;

    // Performance API measurement
    if (
      typeof performance !== 'undefined' &&
      'mark' in performance &&
      'measure' in performance
    ) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }

    // Send to monitoring services
    this.trackMetric({
      name: `performance.${name}`,
      value: duration,
      unit: 'ms',
      tags: {
        operation: name,
        ...metric.metadata,
      },
    });

    // Log slow operations
    if (duration > 1000) {
      console.warn(
        `Slow operation detected: ${name} took ${duration.toFixed(2)}ms`
      );

      // Send to Sentry for slow operations
      Sentry.addBreadcrumb({
        message: `Slow operation: ${name}`,
        level: 'warning',
        data: {
          duration,
          ...metric.metadata,
        },
      });
    }

    this.metrics.delete(name);
    return duration;
  }

  /**
   * Track custom metrics
   */
  static trackMetric(metric: MetricData): void {
    const enrichedMetric = {
      ...metric,
      timestamp: metric.timestamp || Date.now(),
    };

    this.customMetrics.push(enrichedMetric);

    // Send to PostHog if available
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('custom_metric', {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_unit: metric.unit,
        ...metric.tags,
      });
    }

    // Send to Sentry as custom metric
    Sentry.addBreadcrumb({
      message: `Metric: ${metric.name}`,
      level: 'info',
      data: enrichedMetric,
    });

    // Log in development
    if (process.env['NODE_ENV'] === 'development') {
      console.log(
        `📊 Metric: ${metric.name} = ${metric.value}${metric.unit || ''}`,
        metric.tags
      );
    }
  }

  /**
   * Track API call performance and status
   */
  static trackAPICall(
    endpoint: string,
    method: string,
    duration: number,
    status: number,
    error?: Error
  ): void {
    this.trackMetric({
      name: 'api.call',
      value: duration,
      unit: 'ms',
      tags: {
        endpoint,
        method,
        status: status.toString(),
        success: status < 400 ? 'true' : 'false',
      },
    });

    // Track errors separately
    if (error || status >= 400) {
      this.trackError(error || new Error(`API call failed: ${status}`), {
        endpoint,
        method,
        status,
        duration,
      });
    }
  }

  /**
   * Track database query performance
   */
  static trackDatabaseQuery(
    query: string,
    duration: number,
    rowCount?: number,
    error?: Error
  ): void {
    this.trackMetric({
      name: 'database.query',
      value: duration,
      unit: 'ms',
      tags: {
        query_type: this.getQueryType(query),
        row_count: rowCount?.toString(),
        success: error ? 'false' : 'true',
      },
    });

    if (error) {
      this.trackError(error, {
        query: query.substring(0, 100), // Truncate for privacy
        duration,
        rowCount,
      });
    }
  }

  /**
   * Track user interactions
   */
  static trackUserAction(
    action: string,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    this.trackMetric({
      name: 'user.action',
      value: 1,
      tags: {
        action,
        user_id: userId || 'anonymous',
        ...metadata,
      },
    });

    // Track in PostHog
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture(action, {
        user_id: userId,
        ...metadata,
      });
    }
  }

  /**
   * Track errors with context
   */
  static trackError(error: Error, context?: Record<string, any>): void {
    // Send to Sentry
    Sentry.captureException(error, {
      tags: context,
      extra: {
        timestamp: new Date().toISOString(),
        userAgent:
          typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
    });

    // Track error metric
    this.trackMetric({
      name: 'error.count',
      value: 1,
      tags: {
        error_type: error.name,
        error_message: error.message.substring(0, 100),
        ...context,
      },
    });

    console.error('Error tracked:', error, context);
  }

  /**
   * Track page performance metrics
   */
  static trackPagePerformance(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      // Get navigation timing
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;

      if (navigation) {
        const metrics = {
          pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
          domContentLoaded:
            navigation.domContentLoadedEventEnd - navigation.fetchStart,
          firstContentfulPaint: 0,
          largestContentfulPaint: 0,
          timeToFirstByte: navigation.responseStart - navigation.requestStart,
          dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcpConnect: navigation.connectEnd - navigation.connectStart,
        };

        // Get paint metrics
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            metrics.firstContentfulPaint = entry.startTime;
          }
        });

        // Get LCP
        if ('PerformanceObserver' in window) {
          try {
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const lastEntry = entries[entries.length - 1];
              metrics.largestContentfulPaint = lastEntry.startTime;

              // Track all metrics
              Object.entries(metrics).forEach(([name, value]) => {
                this.trackMetric({
                  name: `performance.${name}`,
                  value: Math.round(value),
                  unit: 'ms',
                  tags: {
                    page: window.location.pathname,
                  },
                });
              });
            });

            observer.observe({ entryTypes: ['largest-contentful-paint'] });
          } catch (error) {
            console.warn('LCP observer failed:', error);
          }
        }
      }
    });
  }

  /**
   * Monitor memory usage (Chrome only)
   */
  static trackMemoryUsage(): void {
    if (typeof window === 'undefined' || !('memory' in performance)) return;

    const memory = (performance as any).memory;

    this.trackMetric({
      name: 'memory.usage',
      value: memory.usedJSHeapSize,
      unit: 'bytes',
      tags: {
        total: memory.totalJSHeapSize.toString(),
        limit: memory.jsHeapSizeLimit.toString(),
      },
    });

    // Warn if memory usage is high
    const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    if (usagePercent > 80) {
      console.warn(`High memory usage: ${usagePercent.toFixed(1)}%`);

      this.trackMetric({
        name: 'memory.warning',
        value: usagePercent,
        unit: 'percent',
      });
    }
  }

  /**
   * Get all collected metrics
   */
  static getMetrics(): MetricData[] {
    return [...this.customMetrics];
  }

  /**
   * Clear collected metrics
   */
  static clearMetrics(): void {
    this.customMetrics.length = 0;
    this.metrics.clear();
  }

  /**
   * Get query type from SQL string
   */
  private static getQueryType(query: string): string {
    const trimmed = query.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    if (trimmed.startsWith('CREATE')) return 'CREATE';
    if (trimmed.startsWith('ALTER')) return 'ALTER';
    if (trimmed.startsWith('DROP')) return 'DROP';
    return 'OTHER';
  }
}

/**
 * Performance monitoring hook for React components
 */
export function usePerformanceMonitoring(componentName: string) {
  const startTime = performance.now();

  return {
    trackRender: () => {
      const renderTime = performance.now() - startTime;
      MonitoringService.trackMetric({
        name: 'component.render',
        value: renderTime,
        unit: 'ms',
        tags: {
          component: componentName,
        },
      });
    },

    trackInteraction: (action: string, metadata?: Record<string, any>) => {
      MonitoringService.trackUserAction(
        `${componentName}.${action}`,
        undefined,
        metadata
      );
    },

    trackError: (error: Error, context?: Record<string, any>) => {
      MonitoringService.trackError(error, {
        component: componentName,
        ...context,
      });
    },
  };
}

/**
 * Automatic performance monitoring wrapper
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: any[]) => {
    MonitoringService.startMeasurement(name);

    try {
      const result = fn(...args);

      // Handle async functions
      if (result && typeof result.then === 'function') {
        return result
          .then((value: any) => {
            MonitoringService.endMeasurement(name);
            return value;
          })
          .catch((error: Error) => {
            MonitoringService.endMeasurement(name);
            MonitoringService.trackError(error, { function: name });
            throw error;
          });
      }

      MonitoringService.endMeasurement(name);
      return result;
    } catch (error) {
      MonitoringService.endMeasurement(name);
      MonitoringService.trackError(error as Error, { function: name });
      throw error;
    }
  }) as T;
}

// Initialize monitoring
if (typeof window !== 'undefined') {
  // Track page performance on load
  MonitoringService.trackPagePerformance();

  // Track memory usage periodically
  setInterval(() => {
    MonitoringService.trackMemoryUsage();
  }, 30000); // Every 30 seconds

  // Track unhandled errors
  window.addEventListener('error', (event) => {
    MonitoringService.trackError(event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    MonitoringService.trackError(
      new Error(event.reason?.toString() || 'Unhandled promise rejection'),
      { type: 'unhandled_rejection' }
    );
  });
}

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, any>) => void;
    };
  }
}
