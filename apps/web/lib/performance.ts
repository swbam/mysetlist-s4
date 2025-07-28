import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

// Types for web vitals metrics
type MetricName = "CLS" | "FCP" | "INP" | "LCP" | "TTFB";

interface Metric {
  name: MetricName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  navigationType:
    | "navigate"
    | "reload"
    | "back-forward"
    | "back-forward-cache"
    | "prerender"
    | "restore";
}

// Thresholds for performance metrics (in milliseconds or score)
const thresholds = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
};

// Get performance rating based on metric value and thresholds
function getMetricRating(
  name: MetricName,
  value: number,
): "good" | "needs-improvement" | "poor" {
  const threshold = thresholds[name];
  if (value <= threshold.good) {
    return "good";
  }
  if (value <= threshold.poor) {
    return "needs-improvement";
  }
  return "poor";
}

// Send metrics to analytics endpoint
async function sendToAnalytics(metric: Metric) {
  // Only send in production
  if (process.env["NODE_ENV"] !== "production") {
    return;
  }

  const body = {
    name: metric.name,
    value: Math.round(metric.value),
    rating: metric.rating,
    delta: Math.round(metric.delta),
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  };

  // Use sendBeacon for reliability
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
    navigator.sendBeacon("/api/analytics/vitals", blob);
  } else {
    // Fallback to fetch
    fetch("/api/analytics/vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      // Silently fail - don't impact user experience
    });
  }
}

// Initialize web vitals reporting
export function initWebVitals() {
  onCLS((metric) =>
    sendToAnalytics({
      ...metric,
      name: "CLS",
      rating: getMetricRating("CLS", metric.value),
    }),
  );

  onFCP((metric) =>
    sendToAnalytics({
      ...metric,
      name: "FCP",
      rating: getMetricRating("FCP", metric.value),
    }),
  );

  onINP((metric) =>
    sendToAnalytics({
      ...metric,
      name: "INP",
      rating: getMetricRating("INP", metric.value),
    }),
  );

  onLCP((metric) =>
    sendToAnalytics({
      ...metric,
      name: "LCP",
      rating: getMetricRating("LCP", metric.value),
    }),
  );

  onTTFB((metric) =>
    sendToAnalytics({
      ...metric,
      name: "TTFB",
      rating: getMetricRating("TTFB", metric.value),
    }),
  );
}

// Performance monitoring utilities
export const performanceUtils = {
  // Mark a performance timestamp
  mark(name: string) {
    if (typeof window !== "undefined" && window.performance) {
      performance.mark(name);
    }
  },

  // Measure between two marks
  measure(name: string, startMark: string, endMark?: string) {
    if (typeof window !== "undefined" && window.performance) {
      try {
        if (endMark) {
          performance.measure(name, startMark, endMark);
        } else {
          performance.measure(name, startMark);
        }

        const entries = performance.getEntriesByName(name, "measure");
        const lastEntry = entries.at(-1);

        if (lastEntry && process.env["NODE_ENV"] === "development") {
        }

        return lastEntry?.duration;
      } catch (_e) {
        // Ignore errors from missing marks
      }
    }
    return null;
  },

  // Get navigation timing
  getNavigationTiming() {
    if (typeof window !== "undefined" && window.performance) {
      const navigation = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;

      if (navigation) {
        return {
          dns: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcp: navigation.connectEnd - navigation.connectStart,
          request: navigation.responseStart - navigation.requestStart,
          response: navigation.responseEnd - navigation.responseStart,
          dom: navigation.domComplete - navigation.responseEnd,
          load: navigation.loadEventEnd - navigation.loadEventStart,
          total: navigation.loadEventEnd - navigation.fetchStart,
        };
      }
    }
    return null;
  },

  // Track custom metrics
  trackMetric(name: string, value: number, unit = "ms") {
    if (process.env["NODE_ENV"] === "development") {
    }

    // Send to analytics in production
    if (process.env["NODE_ENV"] === "production" && navigator.sendBeacon) {
      const data = {
        name,
        value,
        unit,
        timestamp: Date.now(),
        url: window.location.href,
      };

      const blob = new Blob([JSON.stringify(data)], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/analytics/metrics", blob);
    }
  },
};

// Resource hints for critical resources
export function addResourceHints() {
  if (typeof window === "undefined") {
    return;
  }

  const head = document.head;

  // Preconnect to critical origins
  const preconnectOrigins = [
    "https://yzwkimtdaabyjbpykquu.supabase.co",
    "https://i.scdn.co",
    "https://s1.ticketm.net",
  ];

  preconnectOrigins.forEach((origin) => {
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    link.crossOrigin = "anonymous";
    head.appendChild(link);
  });

  // DNS prefetch for other origins
  const dnsPrefetchOrigins = [
    "https://api.spotify.com",
    "https://app.ticketmaster.com",
  ];

  dnsPrefetchOrigins.forEach((origin) => {
    const link = document.createElement("link");
    link.rel = "dns-prefetch";
    link.href = origin;
    head.appendChild(link);
  });
}

// Initialize performance monitoring
export function initPerformanceMonitoring() {
  // Initialize web vitals
  initWebVitals();

  // Add resource hints
  addResourceHints();

  // Track initial page load
  if (typeof window !== "undefined") {
    window.addEventListener("load", () => {
      const timing = performanceUtils.getNavigationTiming();
      if (timing) {
        performanceUtils.trackMetric("page-load-total", timing.total);
        performanceUtils.trackMetric("dom-ready", timing.dom);
      }
    });
  }
}
