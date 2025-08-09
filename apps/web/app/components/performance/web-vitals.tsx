"use client";

import { useEffect } from "react";
import { onCLS, onINP, onFCP, onLCP, onTTFB } from "web-vitals";

interface WebVitalMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
}

// Send metrics to analytics endpoint
const sendToAnalytics = async (metric: WebVitalMetric) => {
  try {
    await fetch("/api/analytics/vitals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      }),
    });
  } catch (error) {
    console.error("Failed to send web vital:", error);
  }
};

// Performance observer for custom metrics
const observePerformance = () => {
  // Observe navigation timing
  if ("PerformanceObserver" in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "navigation") {
            const navEntry = entry as PerformanceNavigationTiming;

            // Send custom navigation metrics
            sendToAnalytics({
              name: "DOM_CONTENT_LOADED",
              value:
                navEntry.domContentLoadedEventEnd -
                navEntry.domContentLoadedEventStart,
              rating: "good", // We'll determine this based on thresholds
              delta: 0,
              id: "nav-" + Date.now(),
            });
          }
        }
      });

      observer.observe({ entryTypes: ["navigation"] });
    } catch (error) {
      console.error("Performance observer error:", error);
    }
  }
};

// Resource loading performance
const observeResourceTiming = () => {
  if ("PerformanceObserver" in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;

          // Track slow resources
          if (resourceEntry.duration > 1000) {
            // > 1 second
            sendToAnalytics({
              name: "SLOW_RESOURCE",
              value: resourceEntry.duration,
              rating: "poor",
              delta: 0,
              id: "resource-" + Date.now(),
            });
          }
        }
      });

      observer.observe({ entryTypes: ["resource"] });
    } catch (error) {
      console.error("Resource observer error:", error);
    }
  }
};

export function WebVitalsReporter() {
  useEffect(() => {
    // Core Web Vitals
    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);

    // Custom performance metrics
    observePerformance();
    observeResourceTiming();

    // Memory usage (if available)
    if ("memory" in performance) {
      const memoryInfo = (performance as any).memory;
      sendToAnalytics({
        name: "MEMORY_USAGE",
        value: memoryInfo.usedJSHeapSize,
        rating: memoryInfo.usedJSHeapSize > 50000000 ? "poor" : "good", // 50MB threshold
        delta: 0,
        id: "memory-" + Date.now(),
      });
    }

    // Connection information
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      sendToAnalytics({
        name: "CONNECTION_TYPE",
        value: connection.downlink || 0,
        rating:
          connection.effectiveType === "4g" ? "good" : "needs-improvement",
        delta: 0,
        id: "connection-" + Date.now(),
      });
    }
  }, []);

  return null; // This component doesn't render anything
}

// Hook for manual performance tracking
export function usePerformanceTracking() {
  const trackCustomMetric = (
    name: string,
    value: number,
    rating?: "good" | "needs-improvement" | "poor",
  ) => {
    sendToAnalytics({
      name: name.toUpperCase(),
      value,
      rating:
        rating ||
        (value < 100 ? "good" : value < 300 ? "needs-improvement" : "poor"),
      delta: 0,
      id: `custom-${name}-${Date.now()}`,
    });
  };

  const trackUserTiming = (name: string, startTime?: number) => {
    if (startTime) {
      const duration = performance.now() - startTime;
      trackCustomMetric(name, duration);
      return duration;
    } else {
      return performance.now();
    }
  };

  const trackPageLoad = () => {
    if (document.readyState === "complete") {
      const loadTime =
        performance.timing.loadEventEnd - performance.timing.navigationStart;
      trackCustomMetric("PAGE_LOAD_TIME", loadTime);
    } else {
      window.addEventListener("load", () => {
        const loadTime =
          performance.timing.loadEventEnd - performance.timing.navigationStart;
        trackCustomMetric("PAGE_LOAD_TIME", loadTime);
      });
    }
  };

  return {
    trackCustomMetric,
    trackUserTiming,
    trackPageLoad,
  };
}
