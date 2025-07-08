'use client';

import {
  type UseLiveTrendingOptions,
  type UseTrendingOptions,
  useLiveTrending,
  useRecentActivity,
  useTrendingArtists,
  useTrendingShows,
  useTrendingStats,
  useTrendingVenues,
} from '@/hooks/use-trending';
import { type ReactNode, createContext, useContext } from 'react';

interface TrendingContextValue {
  shows: ReturnType<typeof useTrendingShows>;
  artists: ReturnType<typeof useTrendingArtists>;
  venues: ReturnType<typeof useTrendingVenues>;
  liveTrending: ReturnType<typeof useLiveTrending>;
  stats: ReturnType<typeof useTrendingStats>;
  recentActivity: ReturnType<typeof useRecentActivity>;
}

const TrendingContext = createContext<TrendingContextValue | null>(null);

export interface TrendingDataProviderProps {
  children: ReactNode;
  showsOptions?: UseTrendingOptions;
  artistsOptions?: UseTrendingOptions;
  venuesOptions?: UseTrendingOptions;
  liveTrendingOptions?: UseLiveTrendingOptions;
  enableAutoRefresh?: boolean;
}

export function TrendingDataProvider({
  children,
  showsOptions,
  artistsOptions,
  venuesOptions,
  liveTrendingOptions,
  enableAutoRefresh = false,
}: TrendingDataProviderProps) {
  const shows = useTrendingShows({
    ...showsOptions,
    autoRefresh: enableAutoRefresh,
  });

  const artists = useTrendingArtists({
    ...artistsOptions,
    autoRefresh: enableAutoRefresh,
  });

  const venues = useTrendingVenues({
    ...venuesOptions,
    autoRefresh: enableAutoRefresh,
  });

  const liveTrending = useLiveTrending({
    ...liveTrendingOptions,
    autoRefresh: enableAutoRefresh,
  });

  const stats = useTrendingStats();
  const recentActivity = useRecentActivity({ autoRefresh: enableAutoRefresh });

  const value: TrendingContextValue = {
    shows,
    artists,
    venues,
    liveTrending,
    stats,
    recentActivity,
  };

  return (
    <TrendingContext.Provider value={value}>
      {children}
    </TrendingContext.Provider>
  );
}

export function useTrendingData() {
  const context = useContext(TrendingContext);
  if (!context) {
    throw new Error(
      'useTrendingData must be used within a TrendingDataProvider'
    );
  }
  return context;
}

// Convenience hook for just live trending data
export function useLiveTrendingData() {
  const context = useContext(TrendingContext);
  if (!context) {
    throw new Error(
      'useLiveTrendingData must be used within a TrendingDataProvider'
    );
  }
  return context.liveTrending;
}
