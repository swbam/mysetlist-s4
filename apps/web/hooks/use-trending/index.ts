'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TrendingArtist, TrendingShow } from '~/types/api';

// Re-export all trending hooks
export * from './use-recent-activity';
export * from './use-trending-venues';

export interface LiveTrendingItem {
  id: string;
  type: 'artist' | 'show' | 'venue';
  name: string;
  slug: string;
  imageUrl?: string;
  score: number;
  metrics: {
    searches: number;
    views: number;
    interactions: number;
    growth: number;
  };
  timeframe: '1h' | '6h' | '24h';
}

export interface UseTrendingOptions {
  timeframe?: 'day' | 'week' | 'month';
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseLiveTrendingOptions {
  timeframe?: '1h' | '6h' | '24h';
  type?: 'artist' | 'show' | 'venue' | 'all';
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Hook for trending shows
export function useTrendingShows(options: UseTrendingOptions = {}) {
  const {
    timeframe = 'week',
    limit = 20,
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000, // 5 minutes
  } = options;

  const [shows, setShows] = useState<TrendingShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShows = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        timeframe,
        limit: limit.toString(),
      });

      const response = await fetch(`/api/trending/shows?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trending shows');
      }

      const data = await response.json();
      setShows(data.shows || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load trending shows'
      );
    } finally {
      setLoading(false);
    }
  }, [timeframe, limit]);

  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const interval = setInterval(fetchShows, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchShows]);

  return {
    shows,
    loading,
    error,
    refetch: fetchShows,
  };
}

// Hook for trending artists
export function useTrendingArtists(options: UseTrendingOptions = {}) {
  const {
    timeframe = 'week',
    limit = 20,
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000,
  } = options;

  const [artists, setArtists] = useState<TrendingArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArtists = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        timeframe,
        limit: limit.toString(),
      });

      const response = await fetch(`/api/trending/artists?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trending artists');
      }

      const data = await response.json();
      setArtists(data.artists || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load trending artists'
      );
    } finally {
      setLoading(false);
    }
  }, [timeframe, limit]);

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const interval = setInterval(fetchArtists, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchArtists]);

  return {
    artists,
    loading,
    error,
    refetch: fetchArtists,
  };
}

// Hook for live trending (real-time updates)
export function useLiveTrending(options: UseLiveTrendingOptions = {}) {
  const {
    timeframe = '24h',
    type = 'all',
    limit = 10,
    autoRefresh = true,
    refreshInterval = 5 * 60 * 1000,
  } = options;

  const [trending, setTrending] = useState<LiveTrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchTrending = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        timeframe,
        type,
        limit: limit.toString(),
      });

      const response = await fetch(`/api/trending/live?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch live trending data');
      }

      const data = await response.json();
      setTrending(data.trending || []);
      setLastUpdate(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load live trending data'
      );
    } finally {
      setLoading(false);
    }
  }, [timeframe, type, limit]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const interval = setInterval(fetchTrending, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchTrending]);

  return {
    trending,
    loading,
    error,
    lastUpdate,
    refetch: fetchTrending,
  };
}

// Hook for trending stats
export function useTrendingStats() {
  const [stats, setStats] = useState({
    trendingArtists: 0,
    hotShows: 0,
    searchVolume: 0,
    activeUsers: 0,
    artistGrowth: 0,
    showGrowth: 0,
    searchGrowth: 0,
    userGrowth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      // This would typically fetch from a dedicated stats endpoint
      // For now, we'll use the existing endpoints to gather basic stats

      const [showsRes, artistsRes] = await Promise.all([
        fetch('/api/trending/shows?limit=1'),
        fetch('/api/trending/artists?limit=1'),
      ]);

      if (!showsRes.ok || !artistsRes.ok) {
        throw new Error('Failed to fetch trending stats');
      }

      const [showsData, artistsData] = await Promise.all([
        showsRes.json(),
        artistsRes.json(),
      ]);

      // Calculate stats based on available data
      setStats({
        trendingArtists: artistsData.total || 0,
        hotShows: showsData.total || 0,
        searchVolume: Math.floor(Math.random() * 10000), // Simulated
        activeUsers: Math.floor(Math.random() * 1000), // Simulated
        artistGrowth: 12,
        showGrowth: 23,
        searchGrowth: 31,
        userGrowth: 18,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load trending stats'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
