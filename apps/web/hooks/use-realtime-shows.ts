'use client';

import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '~/lib/supabase/client';

interface Show {
  id: string;
  name: string;
  date: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  artist_id: string;
  venue_id: string;
  created_at: string;
  artist?: {
    id: string;
    name: string;
    slug: string;
  };
  venue?: {
    id: string;
    name: string;
    city: string;
    country: string;
  };
}

interface UseRealtimeShowsOptions {
  artistId?: string;
  venueId?: string;
  status?: Show['status'];
  onNewShow?: (show: Show) => void;
  onShowUpdated?: (show: Show) => void;
  limit?: number;
}

export function useRealtimeShows({
  artistId,
  venueId,
  status,
  onNewShow,
  onShowUpdated,
  limit = 20,
}: UseRealtimeShowsOptions = {}) {
  const [shows, setShows] = useState<Show[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Fetch initial shows
  const fetchShows = useCallback(async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('shows')
        .select(`
          *,
          artist:artists(id, name, slug),
          venue:venues(id, name, city, country)
        `)
        .order('date', { ascending: false })
        .limit(limit);

      if (artistId) {
        query = query.eq('artist_id', artistId);
      }
      if (venueId) {
        query = query.eq('venue_id', venueId);
      }
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (!error && data) {
        setShows(data);
      }
    } catch (_error) {
    } finally {
      setIsLoading(false);
    }
  }, [artistId, venueId, status, limit, supabase]);

  useEffect(() => {
    // Initial fetch
    fetchShows();

    // Build filters for subscription
    const filters: any = {};
    if (artistId) {
      filters.artist_id = `eq.${artistId}`;
    }
    if (venueId) {
      filters.venue_id = `eq.${venueId}`;
    }
    if (status) {
      filters.status = `eq.${status}`;
    }

    // Subscribe to new shows
    const channel = supabase.channel('shows-realtime').on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'shows',
        ...(Object.keys(filters).length > 0 && {
          filter: Object.entries(filters)
            .map(([k, v]) => `${k}=${v}`)
            .join(','),
        }),
      },
      async (payload: RealtimePostgresChangesPayload<Show>) => {
        if (payload.new && 'id' in payload.new) {
          // Fetch the full show data with relations
          const { data: fullShow } = await supabase
            .from('shows')
            .select(`
                *,
                artist:artists(id, name, slug),
                venue:venues(id, name, city, country)
              `)
            .eq('id', payload.new.id)
            .single();

          if (fullShow) {
            setShows((prev) => [fullShow, ...prev].slice(0, limit));
            onNewShow?.(fullShow);
          }
        }
      }
    );

    // Subscribe to show updates
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'shows',
      },
      async (payload: RealtimePostgresChangesPayload<Show>) => {
        if (payload.new && 'id' in payload.new) {
          // Check if this show matches our filters
          if (
            artistId &&
            'artist_id' in payload.new &&
            payload.new.artist_id !== artistId
          ) {
            return;
          }
          if (
            venueId &&
            'venue_id' in payload.new &&
            payload.new.venue_id !== venueId
          ) {
            return;
          }
          if (
            status &&
            'status' in payload.new &&
            payload.new.status !== status
          ) {
            return;
          }

          // Fetch the full show data with relations
          const { data: fullShow } = await supabase
            .from('shows')
            .select(`
              *,
              artist:artists(id, name, slug),
              venue:venues(id, name, city, country)
            `)
            .eq('id', payload.new.id)
            .single();

          if (fullShow) {
            setShows((prev) => {
              const index = prev.findIndex((s) => s.id === fullShow.id);
              if (index !== -1) {
                const updated = [...prev];
                updated[index] = fullShow;
                return updated;
              }
              return prev;
            });
            onShowUpdated?.(fullShow);
          }
        }
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    artistId,
    venueId,
    status,
    limit,
    supabase,
    fetchShows,
    onNewShow,
    onShowUpdated,
  ]);

  return {
    shows,
    isLoading,
    refetch: fetchShows,
  };
}
