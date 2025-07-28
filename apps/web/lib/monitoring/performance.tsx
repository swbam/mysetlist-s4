import React, { useEffect } from "react";

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

interface VitalMetrics {
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  FCP?: number; // First Contentful Paint
  TTFB?: number; // Time to First Byte
  TTI?: number; // Time to Interactive
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private vitalMetrics: VitalMetrics = {};
  private observer?: PerformanceObserver;

  constructor() {
    if (typeof window !== "undefined" && "PerformanceObserver" in window) {
      this.initializeObserver();
    }
  }

  private initializeObserver() {
    // Observe Largest Contentful Paint
    this.observeLCP();

    // Observe First Input Delay
    this.observeFID();

    // Observe Cumulative Layout Shift
    this.observeCLS();

    // Observe other metrics
    this.observePaintTiming();
  }

  private observeLCP() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries.at(-1) as any;
      if (lastEntry) {
        this.vitalMetrics.LCP = lastEntry.renderTime || lastEntry.loadTime;
        if (this.vitalMetrics.LCP !== undefined) {
          this.reportMetric("LCP", this.vitalMetrics.LCP, "ms");
        }
      }
    });

    observer.observe({ entryTypes: ["largest-contentful-paint"] });
  }

  private observeFID() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.vitalMetrics.FID = entry.processingStart - entry.startTime;
        if (this.vitalMetrics.FID !== undefined) {
          this.reportMetric("FID", this.vitalMetrics.FID, "ms");
        }
      });
    });

    observer.observe({ entryTypes: ["first-input"] });
  }

  private observeCLS() {
    let clsValue = 0;
    const clsEntries: any[] = [];

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      });

      this.vitalMetrics.CLS = clsValue;
      if (this.vitalMetrics.CLS !== undefined) {
        this.reportMetric("CLS", this.vitalMetrics.CLS, "score");
      }
    });

    observer.observe({ entryTypes: ["layout-shift"] });
  }

  private observePaintTiming() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === "first-contentful-paint") {
          this.vitalMetrics.FCP = entry.startTime;
          if (this.vitalMetrics.FCP !== undefined) {
            this.reportMetric("FCP", this.vitalMetrics.FCP, "ms");
          }
        }
      });
    });

    observer.observe({ entryTypes: ["paint"] });
  }

  public reportMetric(name: string, value: number, unit: string) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);
    this.sendToAnalytics(metric);
    this.checkThresholds(metric);
  }

  private sendToAnalytics(metric: PerformanceMetric) {
    // Send to analytics service
    if (process.env["NODE_ENV"] === "production") {
      fetch("/api/analytics/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metric),
      }).catch(console.error);
    }

    // Log in development
    if (process.env["NODE_ENV"] === "development") {
    }
  }

  private checkThresholds(metric: PerformanceMetric) {
    const thresholds: Record<string, number> = {
      LCP: 2500, // 2.5s
      FID: 100, // 100ms
      CLS: 0.1, // 0.1 score
      FCP: 1500, // 1.5s
      TTFB: 800, // 800ms
    };

    const threshold = thresholds[metric.name];
    if (threshold && metric.value > threshold) {
      // Report to error tracking
      if (typeof window !== "undefined" && "Sentry" in window) {
        (window as any).Sentry.captureMessage(
          `Performance threshold exceeded: ${metric.name}`,
          "warning",
        );
      }
    }
  }

  measureNavigation() {
    if (typeof window === "undefined") {
      return;
    }

    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;

    const metrics = {
      DNS: navigation.domainLookupEnd - navigation.domainLookupStart,
      TCP: navigation.connectEnd - navigation.connectStart,
      TTFB: navigation.responseStart - navigation.requestStart,
      Download: navigation.responseEnd - navigation.responseStart,
      DOMParse: navigation.domInteractive - navigation.responseEnd,
      DOMContentLoaded:
        navigation.domContentLoadedEventEnd -
        navigation.domContentLoadedEventStart,
      Load: navigation.loadEventEnd - navigation.loadEventStart,
    };

    Object.entries(metrics).forEach(([name, value]) => {
      this.reportMetric(name, value, "ms");
    });
  }

  measureComponent(componentName: string, fn: () => void) {
    const startTime = performance.now();

    try {
      fn();
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.reportMetric(`Component:${componentName}`, duration, "ms");
    }
  }

  async measureAsyncOperation<T>(
    operationName: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await fn();
      return result;
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.reportMetric(`Async:${operationName}`, duration, "ms");
    }
  }

  getMetrics(): PerformanceMetric[] {
    return this.metrics;
  }

  getVitalMetrics(): VitalMetrics {
    return this.vitalMetrics;
  }

  reset() {
    this.metrics = [];
    this.vitalMetrics = {};
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      performanceMonitor.reportMetric(
        `Component:${componentName}:Mount`,
        duration,
        "ms",
      );
    };
  }, [componentName]);
}

// HOC for performance monitoring
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string,
) {
  return React.memo((props: P) => {
    usePerformanceMonitor(componentName);
    return <Component {...props} />;
  });
}
