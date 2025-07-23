'use client';

import { useEffect } from 'react';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

interface WebVital {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

function sendToAnalytics(metric: WebVital) {
  // Only send in production or when explicitly enabled
  if (process.env["NODE_ENV"] !== 'production' && !process.env['NEXT_PUBLIC_ENABLE_ANALYTICS']) {
    console.log('Web Vital:', metric);
    return;
  }

  // Ensure we're in browser context
  if (typeof window === 'undefined') {
    return;
  }

  try {
    fetch('/api/analytics/vitals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...metric,
        url: window.location.href,
        timestamp: Date.now(),
      }),
    }).catch((error) => {
      console.warn('Failed to send web vital:', error);
    });
  } catch (error) {
    console.warn('Web vitals analytics error:', error);
  }
}

export function WebVitalsTracker() {
  useEffect(() => {
    // Ensure we're in the browser before tracking vitals
    if (typeof window === 'undefined') {
      return;
    }

    // Add a small delay to ensure hydration is complete
    const timer = setTimeout(() => {
      try {
        // Track Core Web Vitals
        onCLS(sendToAnalytics);
        onFCP(sendToAnalytics);
        onINP(sendToAnalytics);
        onLCP(sendToAnalytics);
        onTTFB(sendToAnalytics);
      } catch (error) {
        console.warn('Web vitals tracking error:', error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return null; // This component only tracks metrics, doesn't render anything
}

export default WebVitalsTracker;