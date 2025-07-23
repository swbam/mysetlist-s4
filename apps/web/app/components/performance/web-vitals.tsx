'use client';

import { useEffect } from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
import { generateId } from '~/lib/utils/id-generator';

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

// Send metrics to analytics endpoint
const sendToAnalytics = async (metric: WebVitalMetric) => {
  // Ensure we're in browser context
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return;
  }

  try {
    await fetch('/api/analytics/vitals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    console.error('Failed to send web vital:', error);
  }
};

// Performance observer for custom metrics
const observePerformance = () => {
  // Ensure we're in browser context
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  // Observe navigation timing
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            
            // Send custom navigation metrics
            sendToAnalytics({
              name: 'DOM_CONTENT_LOADED',
              value: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              rating: 'good', // We'll determine this based on thresholds
              delta: 0,
              id: generateId('nav'),
            });
          }
        }
      });

      observer.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      console.error('Performance observer error:', error);
    }
};

// Resource loading performance
const observeResourceTiming = () => {
  // Ensure we're in browser context
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Track slow resources
          if (resourceEntry.duration > 1000) { // > 1 second
            sendToAnalytics({
              name: 'SLOW_RESOURCE',
              value: resourceEntry.duration,
              rating: 'poor',
              delta: 0,
              id: 'resource-' + Date.now(),
            });
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.error('Resource observer error:', error);
    }
};

export function WebVitalsReporter() {
  useEffect(() => {
    // Ensure we're in browser context
    if (typeof window === 'undefined') {
      return;
    }

    // Add delay to ensure hydration is complete
    const timer = setTimeout(() => {
      try {
        // Core Web Vitals
        getCLS(sendToAnalytics);
        getFID(sendToAnalytics);
        getFCP(sendToAnalytics);
        getLCP(sendToAnalytics);
        getTTFB(sendToAnalytics);

        // Custom performance metrics
        observePerformance();
        observeResourceTiming();

        // Memory usage (if available)
        if ('memory' in performance) {
          const memoryInfo = (performance as any).memory;
          sendToAnalytics({
            name: 'MEMORY_USAGE',
            value: memoryInfo.usedJSHeapSize,
            rating: memoryInfo.usedJSHeapSize > 50000000 ? 'poor' : 'good', // 50MB threshold
            delta: 0,
            id: 'memory-' + Date.now(),
          });
        }

        // Connection information
        if ('connection' in navigator) {
          const connection = (navigator as any).connection;
          sendToAnalytics({
            name: 'CONNECTION_TYPE',
            value: connection.downlink || 0,
            rating: connection.effectiveType === '4g' ? 'good' : 'needs-improvement',
            delta: 0,
            id: 'connection-' + Date.now(),
          });
        }
      } catch (error) {
        console.warn('Performance metrics error:', error);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, []);

  return null; // This component doesn't render anything
}

// Hook for manual performance tracking
export function usePerformanceTracking() {
  const trackCustomMetric = (name: string, value: number, rating?: 'good' | 'needs-improvement' | 'poor') => {
    sendToAnalytics({
      name: name.toUpperCase(),
      value,
      rating: rating || (value < 100 ? 'good' : value < 300 ? 'needs-improvement' : 'poor'),
      delta: 0,
      id: `custom-${name}-${Date.now()}`,
    });
  };

  const trackUserTiming = (name: string, startTime?: number) => {
    if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
      return 0;
    }

    try {
      if (startTime) {
        const duration = performance.now() - startTime;
        trackCustomMetric(name, duration);
        return duration;
      } else {
        return performance.now();
      }
    } catch (error) {
      console.warn('User timing error:', error);
      return 0;
    }
  };

  const trackPageLoad = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof performance === 'undefined') {
      return;
    }

    try {
      if (document.readyState === 'complete') {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        trackCustomMetric('PAGE_LOAD_TIME', loadTime);
      } else {
        window.addEventListener('load', () => {
          const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
          trackCustomMetric('PAGE_LOAD_TIME', loadTime);
        });
      }
    } catch (error) {
      console.warn('Page load tracking error:', error);
    }
  };

  return {
    trackCustomMetric,
    trackUserTiming,
    trackPageLoad,
  };
}