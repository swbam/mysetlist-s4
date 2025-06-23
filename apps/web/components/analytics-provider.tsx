'use client';

import { useEffect } from 'react';
import { useAnalyticsSetup } from '@/hooks/use-analytics';

export function AnalyticsSetupProvider() {
  // Initialize all analytics tracking
  useAnalyticsSetup();
  
  useEffect(() => {
    // Track PWA install events
    window.addEventListener('appinstalled', () => {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.capture('pwa_install_accepted');
      }
    });
    
    // Track offline/online events
    window.addEventListener('online', () => {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.capture('app_online');
      }
    });
    
    window.addEventListener('offline', () => {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.capture('app_offline');
      }
    });
  }, []);
  
  return null;
}