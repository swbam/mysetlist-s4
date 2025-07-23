'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental';
import { useState, useEffect } from 'react';
import { queryClient, setupCachePersistence, performanceMonitor, backgroundSync } from '~/lib/cache/react-query-config';

interface ReactQueryProviderProps {
  children: React.ReactNode;
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Setup cache persistence
    setupCachePersistence();
    
    // Start background sync for critical data
    const syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        backgroundSync.syncTrendingData();
        backgroundSync.syncUserData();
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    // Performance monitoring
    const perfInterval = setInterval(() => {
      const stats = performanceMonitor.getCacheStats();
      console.log('Cache stats:', stats);
      
      // Clear stale cache if memory usage is high
      if (stats.cacheSize > 5 * 1024 * 1024) { // 5MB
        performanceMonitor.clearStaleCache();
      }
    }, 10 * 60 * 1000); // Every 10 minutes
    
    // Cleanup intervals on unmount
    return () => {
      clearInterval(syncInterval);
      clearInterval(perfInterval);
    };
  }, []);

  // Don't render on server to avoid hydration issues
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryStreamedHydration>
        {children}
      </ReactQueryStreamedHydration>
      
      {/* Dev tools only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}