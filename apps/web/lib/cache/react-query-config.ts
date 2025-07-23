'use client';

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

// Global error handler for queries
const queryErrorHandler = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Something went wrong';
  
  // Don't show toast for cancelled requests or expected errors
  if (
    message.includes('cancelled') ||
    message.includes('aborted') ||
    message.includes('404')
  ) {
    return;
  }
  
  console.error('Query Error:', error);
  toast.error(`Error: ${message}`);
};

// Global error handler for mutations
const mutationErrorHandler = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Failed to update data';
  console.error('Mutation Error:', error);
  toast.error(`Error: ${message}`);
};

// Query cache with error handling
const queryCache = new QueryCache({
  onError: queryErrorHandler,
});

// Mutation cache with error handling
const mutationCache = new MutationCache({
  onError: mutationErrorHandler,
});

// Optimized QueryClient configuration
export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      // Stale time - data is considered fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      
      // Cache time - data stays in cache for 30 minutes
      gcTime: 1000 * 60 * 30,
      
      // Retry failed queries 3 times
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('404')) {
          return false; // Don't retry 404 errors
        }
        return failureCount < 3;
      },
      
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Background refetch settings
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      
      // Network-aware caching
      networkMode: 'online',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      networkMode: 'online',
    },
  },
});

// Query key factories for consistent cache keys
export const queryKeys = {
  // Artist queries
  artists: {
    all: ['artists'] as const,
    lists: () => [...queryKeys.artists.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.artists.lists(), { filters }] as const,
    details: () => [...queryKeys.artists.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.artists.details(), id] as const,
    shows: (id: string) => [...queryKeys.artists.detail(id), 'shows'] as const,
    stats: (id: string) => [...queryKeys.artists.detail(id), 'stats'] as const,
  },
  
  // Show queries  
  shows: {
    all: ['shows'] as const,
    lists: () => [...queryKeys.shows.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.shows.lists(), { filters }] as const,
    details: () => [...queryKeys.shows.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.shows.details(), id] as const,
    setlist: (id: string) => [...queryKeys.shows.detail(id), 'setlist'] as const,
    votes: (id: string) => [...queryKeys.shows.detail(id), 'votes'] as const,
  },
  
  // Venue queries
  venues: {
    all: ['venues'] as const,
    lists: () => [...queryKeys.venues.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.venues.lists(), { filters }] as const,
    details: () => [...queryKeys.venues.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.venues.details(), id] as const,
    shows: (id: string) => [...queryKeys.venues.detail(id), 'shows'] as const,
  },
  
  // Search queries
  search: {
    all: ['search'] as const,
    query: (query: string, filters: Record<string, any>) => 
      [...queryKeys.search.all, { query, filters }] as const,
  },
  
  // Trending queries
  trending: {
    all: ['trending'] as const,
    artists: (period: string) => [...queryKeys.trending.all, 'artists', period] as const,
    shows: (period: string) => [...queryKeys.trending.all, 'shows', period] as const,
    venues: (period: string) => [...queryKeys.trending.all, 'venues', period] as const,
  },
  
  // User queries
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    votes: () => [...queryKeys.user.all, 'votes'] as const,
    following: () => [...queryKeys.user.all, 'following'] as const,
    activity: () => [...queryKeys.user.all, 'activity'] as const,
  },
};

// Cache invalidation helpers
export const cacheUtils = {
  // Invalidate all data for a specific artist
  invalidateArtist: (artistId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.artists.detail(artistId) });
  },
  
  // Invalidate all data for a specific show
  invalidateShow: (showId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.shows.detail(showId) });
  },
  
  // Invalidate trending data
  invalidateTrending: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.trending.all });
  },
  
  // Invalidate user data
  invalidateUser: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
  },
  
  // Clear all cache
  clearAll: () => {
    queryClient.clear();
  },
  
  // Prefetch data for better UX
  prefetchArtist: (artistId: string) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.artists.detail(artistId),
      queryFn: () => fetch(`/api/artists/${artistId}`).then(res => res.json()),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  },
  
  prefetchShow: (showId: string) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.shows.detail(showId),
      queryFn: () => fetch(`/api/shows/${showId}`).then(res => res.json()),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  },
};

// Performance monitoring for queries
export const performanceMonitor = {
  // Track slow queries
  trackSlowQuery: (queryKey: unknown[], duration: number) => {
    if (duration > 2000) { // Queries taking more than 2 seconds
      console.warn('Slow query detected:', {
        queryKey,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
    }
  },
  
  // Get cache stats
  getCacheStats: () => {
    const queryCache = queryClient.getQueryCache();
    const mutationCache = queryClient.getMutationCache();
    
    return {
      totalQueries: queryCache.getAll().length,
      totalMutations: mutationCache.getAll().length,
      cacheSize: JSON.stringify(queryCache.getAll()).length,
      timestamp: new Date().toISOString(),
    };
  },
  
  // Clear old cache entries
  clearStaleCache: () => {
    queryClient.getQueryCache().clear();
    console.log('Stale cache cleared');
  },
};

// Background sync for critical data
export const backgroundSync = {
  // Sync trending data in background
  syncTrendingData: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.trending.artists('weekly'),
      queryFn: () => fetch('/api/trending/artists?period=weekly').then(res => res.json()),
      staleTime: 1000 * 60 * 10, // 10 minutes
    });
    
    queryClient.prefetchQuery({
      queryKey: queryKeys.trending.shows('weekly'),
      queryFn: () => fetch('/api/trending/shows?period=weekly').then(res => res.json()),
      staleTime: 1000 * 60 * 10, // 10 minutes
    });
  },
  
  // Sync user data in background
  syncUserData: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.user.profile(),
      queryFn: () => fetch('/api/user/profile').then(res => res.json()),
      staleTime: 1000 * 60 * 15, // 15 minutes
    });
  },
};

// Setup cache persistence (optional)
export const setupCachePersistence = () => {
  if (typeof window !== 'undefined') {
    // Save cache to localStorage on page unload
    window.addEventListener('beforeunload', () => {
      const cache = queryClient.getQueryCache();
      const cacheData = cache.getAll().map(query => ({
        queryKey: query.queryKey,
        state: query.state,
      }));
      
      try {
        localStorage.setItem('mysetlist-cache', JSON.stringify(cacheData));
      } catch (error) {
        console.warn('Failed to persist cache:', error);
      }
    });
    
    // Restore cache from localStorage on load
    try {
      const cachedData = localStorage.getItem('mysetlist-cache');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        // Note: Full cache restoration would need more sophisticated implementation
        console.log('Cache restoration available:', parsedData.length, 'entries');
      }
    } catch (error) {
      console.warn('Failed to restore cache:', error);
    }
  }
};