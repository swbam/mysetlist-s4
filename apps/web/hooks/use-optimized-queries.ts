'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys, cacheUtils, performanceMonitor } from '~/lib/cache/react-query-config';
import { useAuth } from '~/app/providers/auth-provider';

// =============================================================================
// ARTIST QUERIES
// =============================================================================

export function useArtist(slug: string) {
  return useQuery({
    queryKey: queryKeys.artists.detail(slug),
    queryFn: async () => {
      const start = performance.now();
      const response = await fetch(`/api/artists/${slug}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch artist: ${response.statusText}`);
      }
      
      const data = await response.json();
      const duration = performance.now() - start;
      
      performanceMonitor.trackSlowQuery(queryKeys.artists.detail(slug), duration);
      
      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - artists don't change often
    gcTime: 1000 * 60 * 30, // 30 minutes cache time
  });
}

export function useArtists(filters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.artists.list(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '20',
        ...filters,
      });
      
      const response = await fetch(`/api/artists?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch artists');
      }
      
      return response.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.hasMore) {
        return pages.length + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useArtistShows(artistId: string) {
  return useQuery({
    queryKey: queryKeys.artists.shows(artistId),
    queryFn: async () => {
      const response = await fetch(`/api/artists/${artistId}/shows`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch artist shows');
      }
      
      return response.json();
    },
    enabled: !!artistId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// =============================================================================
// SHOW QUERIES
// =============================================================================

export function useShow(slug: string) {
  return useQuery({
    queryKey: queryKeys.shows.detail(slug),
    queryFn: async () => {
      const start = performance.now();
      const response = await fetch(`/api/shows/${slug}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch show: ${response.statusText}`);
      }
      
      const data = await response.json();
      const duration = performance.now() - start;
      
      performanceMonitor.trackSlowQuery(queryKeys.shows.detail(slug), duration);
      
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - shows change more frequently
    gcTime: 1000 * 60 * 15, // 15 minutes cache time
  });
}

export function useSetlist(showId: string) {
  return useQuery({
    queryKey: queryKeys.shows.setlist(showId),
    queryFn: async () => {
      const response = await fetch(`/api/shows/${showId}/setlist`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch setlist');
      }
      
      return response.json();
    },
    enabled: !!showId,
    staleTime: 1000 * 30, // 30 seconds - setlists are dynamic
    refetchInterval: 1000 * 60, // Refetch every minute for live shows
  });
}

export function useShowVotes(showId: string) {
  return useQuery({
    queryKey: queryKeys.shows.votes(showId),
    queryFn: async () => {
      const response = await fetch(`/api/shows/${showId}/votes`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch votes');
      }
      
      return response.json();
    },
    enabled: !!showId,
    staleTime: 1000 * 10, // 10 seconds - votes change frequently
    refetchInterval: 1000 * 15, // Refetch every 15 seconds for live updates
  });
}

// =============================================================================
// SEARCH QUERIES
// =============================================================================

export function useSearch(query: string, filters = {}) {
  return useQuery({
    queryKey: queryKeys.search.query(query, filters),
    queryFn: async () => {
      if (!query || query.length < 2) {
        return { results: [] };
      }
      
      const params = new URLSearchParams({
        q: query,
        limit: '10',
        ...filters,
      });
      
      const response = await fetch(`/api/search?${params}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      return response.json();
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

// =============================================================================
// TRENDING QUERIES
// =============================================================================

export function useTrendingArtists(period = 'weekly') {
  return useQuery({
    queryKey: queryKeys.trending.artists(period),
    queryFn: async () => {
      const response = await fetch(`/api/trending/artists?period=${period}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch trending artists');
      }
      
      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useTrendingShows(period = 'weekly') {
  return useQuery({
    queryKey: queryKeys.trending.shows(period),
    queryFn: async () => {
      const response = await fetch(`/api/trending/shows?period=${period}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch trending shows');
      }
      
      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

// =============================================================================
// USER QUERIES (Authenticated)
// =============================================================================

export function useUserProfile() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: async () => {
      const response = await fetch('/api/user/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      
      return response.json();
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

export function useUserVotes() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.user.votes(),
    queryFn: async () => {
      const response = await fetch('/api/user/votes');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user votes');
      }
      
      return response.json();
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUserFollowing() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.user.following(),
    queryFn: async () => {
      const response = await fetch('/api/user/following');
      
      if (!response.ok) {
        throw new Error('Failed to fetch following list');
      }
      
      return response.json();
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

export function useVoteMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ setlistSongId, voteType }: { setlistSongId: string; voteType: 'up' | 'down' | null }) => {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setlistSongId,
          voteType,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to vote');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.shows.votes(data.showId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.votes() });
      
      // Optimistically update the cache
      queryClient.setQueryData(
        queryKeys.shows.votes(data.showId),
        (oldData: any) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            votes: oldData.votes.map((vote: any) =>
              vote.setlistSongId === variables.setlistSongId
                ? { ...vote, voteType: variables.voteType }
                : vote
            ),
          };
        }
      );
    },
  });
}

export function useFollowArtistMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ artistId, follow }: { artistId: string; follow: boolean }) => {
      const response = await fetch('/api/user/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artistId,
          follow,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update follow status');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate following list
      queryClient.invalidateQueries({ queryKey: queryKeys.user.following() });
      
      // Update artist follower count if available
      cacheUtils.invalidateArtist(variables.artistId);
    },
  });
}

// =============================================================================
// PREFETCH UTILITIES
// =============================================================================

export function usePrefetchArtist() {
  const queryClient = useQueryClient();
  
  return (slug: string) => {
    cacheUtils.prefetchArtist(slug);
  };
}

export function usePrefetchShow() {
  const queryClient = useQueryClient();
  
  return (slug: string) => {
    cacheUtils.prefetchShow(slug);
  };
}