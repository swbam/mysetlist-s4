'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTracking } from '@/lib/analytics/tracking';
import { useAuth } from '@/app/providers/auth-provider';

// Auto-track page views
export function usePageTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { track, trackPageView } = useTracking();
  
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname, searchParams, trackPageView]);
}

// Track user authentication state
export function useAuthTracking() {
  const { user } = useAuth();
  const { identify, reset, setUserProperties } = useTracking();
  
  useEffect(() => {
    if (user) {
      identify(user.id, {
        email: user.email,
        signUpDate: user.created_at,
      });
    } else {
      reset();
    }
  }, [user, identify, reset]);
}

// Track errors
export function useErrorTracking() {
  const { trackError } = useTracking();
  
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError(new Error(event.message), {
        errorStack: event.error?.stack,
        pageUrl: event.filename,
      });
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(new Error('Unhandled Promise Rejection'), {
        errorMessage: event.reason?.toString(),
      });
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackError]);
}

// Track performance metrics
export function usePerformanceTracking() {
  const { track } = useTracking();
  
  useEffect(() => {
    if (typeof window === 'undefined' || !window.performance) return;
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          track('PAGE_LOAD_TIME', {
            duration: navEntry.loadEventEnd - navEntry.loadEventStart,
            metric: 'page_load',
            pageUrl: window.location.href,
          });
        }
        
        if (entry.entryType === 'largest-contentful-paint') {
          track('performance_metric', {
            metric: 'lcp',
            duration: entry.startTime,
          });
        }
        
        if (entry.entryType === 'first-input') {
          const fid = entry as PerformanceEventTiming;
          track('performance_metric', {
            metric: 'fid',
            duration: fid.processingStart - fid.startTime,
          });
        }
      }
    });
    
    observer.observe({ entryTypes: ['navigation', 'largest-contentful-paint', 'first-input'] });
    
    return () => observer.disconnect();
  }, [track]);
}

// Combined analytics provider hook
export function useAnalyticsSetup() {
  usePageTracking();
  useAuthTracking();
  useErrorTracking();
  usePerformanceTracking();
}