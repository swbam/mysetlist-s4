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
}

interface UseRealtimeShowOptions {
  showId: string;
  initialStatus?: Show['status'];
  onStatusChange?: (status: Show['status']) => void;
}

export function useRealtimeShow({
  showId,
  initialStatus = 'upcoming',
  onStatusChange,
}: UseRealtimeShowOptions) {
  const [showStatus, setShowStatus] = useState<Show['status']>(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();


  // Fetch current show status
  const fetchShowStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('shows')
        .select('status')
        .eq('id', showId)
        .single();

      if (!error && data) {
        setShowStatus(data.status);
        onStatusChange?.(data.status);
      }
    } catch (_error) {}
  }, [showId, supabase, onStatusChange]);

  useEffect(() => {
    // Initial fetch
    fetchShowStatus();

    // Subscribe to show status changes
    const showChannel = supabase
      .channel(`show-status-${showId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shows',
          filter: `id=eq.${showId}`,
        },
        (payload: RealtimePostgresChangesPayload<Show>) => {
          if (payload.new && 'status' in payload.new) {
            setShowStatus(payload.new.status);
            onStatusChange?.(payload.new.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(showChannel);
    };
  }, [
    showId,
    supabase,
    fetchShowStatus,
    onStatusChange,
  ]);

  return {
    showStatus,
    isLoading,
    refetchStatus: fetchShowStatus,
  };
}
