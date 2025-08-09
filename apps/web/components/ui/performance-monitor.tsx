"use client";

import { useEffect, useRef } from "react";

interface PerformanceMetrics {
  component: string;
  renderTime: number;
  timestamp: number;
}

// Performance monitoring utilities
export const usePerformanceMonitor = (componentName: string) => {
  const renderStartTime = useRef<number>(0);
  const mountTime = useRef<number>(0);

  useEffect(() => {
    // Component mount time
    mountTime.current = performance.now();

    return () => {
      // Component unmount - could track cleanup performance if needed
    };
  }, []);

  const startRender = () => {
    renderStartTime.current = performance.now();
  };

  const endRender = () => {
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;

      // Log performance metrics in development
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[Performance] ${componentName}: ${renderTime.toFixed(2)}ms`,
        );
      }

      // In production, you might want to send this to analytics
      if (process.env.NODE_ENV === "production" && renderTime > 16) {
        // Only log slow renders (> 16ms)
        const metrics: PerformanceMetrics = {
          component: componentName,
          renderTime,
          timestamp: Date.now(),
        };

        // Send to analytics service (example)
        // analytics.track('slow_render', metrics);
      }

      return renderTime;
    }
    return 0;
  };

  return { startRender, endRender };
};

// Component wrapper for automatic performance monitoring
export const withPerformanceMonitor = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string,
) => {
  const WrappedComponent = (props: P) => {
    const displayName =
      componentName || Component.displayName || Component.name;
    const { startRender, endRender } = usePerformanceMonitor(displayName);

    useEffect(() => {
      startRender();
      const renderTime = endRender();

      // Additional checks for performance
      if (renderTime > 50) {
        console.warn(
          `[Performance Warning] ${displayName} took ${renderTime.toFixed(2)}ms to render`,
        );
      }
    });

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withPerformanceMonitor(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  callback: (isIntersecting: boolean) => void,
  options: IntersectionObserverInit = {},
) => {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          callback(entry.isIntersecting);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
        ...options,
      },
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [callback, options]);

  return elementRef;
};

// Core Web Vitals monitoring
export const useCoreWebVitals = () => {
  useEffect(() => {
    // LCP (Largest Contentful Paint)
    const handleLCP = (entries: PerformanceObserverEntryList) => {
      const lastEntry = entries.getEntries().at(-1) as PerformanceEventTiming;
      if (lastEntry) {
        console.log(
          `[Core Web Vitals] LCP: ${lastEntry.startTime.toFixed(2)}ms`,
        );
      }
    };

    // FID (First Input Delay)
    const handleFID = (entries: PerformanceObserverEntryList) => {
      const firstEntry = entries.getEntries()[0] as PerformanceEventTiming;
      if (firstEntry) {
        console.log(
          `[Core Web Vitals] FID: ${firstEntry.processingStart - firstEntry.startTime}ms`,
        );
      }
    };

    // CLS (Cumulative Layout Shift)
    const handleCLS = (entries: PerformanceObserverEntryList) => {
      let cumulativeScore = 0;
      entries.getEntries().forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          cumulativeScore += entry.value;
        }
      });
      console.log(`[Core Web Vitals] CLS: ${cumulativeScore.toFixed(4)}`);
    };

    // Only run in production or when explicitly enabled
    if (
      process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_MONITOR_PERFORMANCE === "true"
    ) {
      try {
        if ("PerformanceObserver" in window) {
          // LCP Observer
          const lcpObserver = new PerformanceObserver(handleLCP);
          lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });

          // FID Observer
          const fidObserver = new PerformanceObserver(handleFID);
          fidObserver.observe({ entryTypes: ["first-input"] });

          // CLS Observer
          const clsObserver = new PerformanceObserver(handleCLS);
          clsObserver.observe({ entryTypes: ["layout-shift"] });

          return () => {
            lcpObserver.disconnect();
            fidObserver.disconnect();
            clsObserver.disconnect();
          };
        }
      } catch (error) {
        console.error("Performance monitoring setup failed:", error);
      }
    }
  }, []);
};

// Bundle size analyzer (development only)
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === "development") {
    useEffect(() => {
      // Estimate bundle size based on loaded scripts
      const scripts = Array.from(document.querySelectorAll("script[src]"));
      let totalSize = 0;

      scripts.forEach(async (script) => {
        try {
          const response = await fetch((script as HTMLScriptElement).src, {
            method: "HEAD",
          });
          const size = response.headers.get("content-length");
          if (size) {
            totalSize += parseInt(size, 10);
          }
        } catch (error) {
          // Ignore fetch errors
        }
      });

      setTimeout(() => {
        if (totalSize > 0) {
          console.log(
            `[Bundle Analysis] Estimated total JS size: ${(totalSize / 1024).toFixed(2)} KB`,
          );
        }
      }, 2000);
    }, []);
  }
};

export default {
  usePerformanceMonitor,
  withPerformanceMonitor,
  useIntersectionObserver,
  useCoreWebVitals,
  analyzeBundleSize,
};
