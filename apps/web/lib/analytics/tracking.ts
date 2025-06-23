'use client';

import { ANALYTICS_EVENTS, type EventProperties, type UserProperties } from './events';

// Mock analytics implementation
export function useAnalytics() {
  return {
    capture: (event: string, properties?: any) => {
      console.log('Analytics event:', event, properties);
    },
    identify: (userId: string, properties?: any) => {
      console.log('Analytics identify:', userId, properties);
    },
    group: (groupType: string, groupKey: string, properties?: any) => {
      console.log('Analytics group:', groupType, groupKey, properties);
    },
    setPersonProperties: (properties: any) => {
      console.log('Analytics person properties:', properties);
    },
    opt_out_capturing: () => {
      console.log('Analytics opt out');
    },
    opt_in_capturing: () => {
      console.log('Analytics opt in');
    },
    reset: () => {
      console.log('Analytics reset');
    },
  };
}

// Custom hook for analytics tracking
export function useTracking() {
  const posthog = useAnalytics();
  
  const track = (event: string, properties?: EventProperties) => {
    if (!posthog) return;
    
    // Add common properties
    const enrichedProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
      pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    };
    
    posthog.capture(event, enrichedProperties);
  };
  
  const identify = (userId: string, properties?: UserProperties) => {
    if (!posthog) return;
    posthog.identify(userId, properties);
  };
  
  const trackPageView = (pageName?: string, properties?: EventProperties) => {
    if (!posthog) return;
    posthog.capture('$pageview', {
      ...properties,
      $current_url: typeof window !== 'undefined' ? window.location.href : undefined,
      pageName,
    });
  };
  
  const trackError = (error: Error, properties?: EventProperties) => {
    if (!posthog) return;
    track(ANALYTICS_EVENTS.API_ERROR, {
      ...properties,
      errorMessage: error.message,
      errorStack: error.stack,
    });
  };
  
  const setUserProperties = (properties: UserProperties) => {
    if (!posthog) return;
    posthog.setPersonProperties(properties);
  };
  
  const reset = () => {
    if (!posthog) return;
    posthog.reset();
  };
  
  return {
    track,
    identify,
    trackPageView,
    trackError,
    setUserProperties,
    reset,
    // Export the events constant for easy access
    EVENTS: ANALYTICS_EVENTS,
  };
}

// Convenience functions for common tracking scenarios
export const trackUserAction = (action: string, entityType: string, entityId: string, additionalProps?: EventProperties) => {
  const posthog = typeof window !== 'undefined' ? (window as any).posthog : null;
  if (!posthog) return;
  
  posthog.capture(action, {
    entityType,
    entityId,
    ...additionalProps,
  });
};

export const trackSearch = (searchType: string, query: string, resultsCount: number, additionalProps?: EventProperties) => {
  const posthog = typeof window !== 'undefined' ? (window as any).posthog : null;
  if (!posthog) return;
  
  posthog.capture(ANALYTICS_EVENTS[`${searchType.toUpperCase()}_SEARCH` as keyof typeof ANALYTICS_EVENTS], {
    searchQuery: query,
    searchResultsCount: resultsCount,
    ...additionalProps,
  });
};

export const trackTiming = (metric: string, duration: number, additionalProps?: EventProperties) => {
  const posthog = typeof window !== 'undefined' ? (window as any).posthog : null;
  if (!posthog) return;
  
  posthog.capture('performance_metric', {
    metric,
    duration,
    ...additionalProps,
  });
};