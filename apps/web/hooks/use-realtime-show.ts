'use client';

import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '~/lib/supabase/client';

interface ShowAttendance {
  show_id: string;
  user_id: string;
  created_at: string;
}

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
  initialAttendanceCount?: number;
  initialStatus?: Show['status'];
  onAttendanceChange?: (count: number) => void;
  onStatusChange?: (status: Show['status']) => void;
}

export function useRealtimeShow({
  showId,
  initialAttendanceCount = 0,
  initialStatus = 'upcoming',
  onAttendanceChange,
  onStatusChange,
}: UseRealtimeShowOptions) {
  const [attendanceCount, setAttendanceCount] = useState(
    initialAttendanceCount
  );
  const [showStatus, setShowStatus] = useState<Show['status']>(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Fetch current attendance count
  const fetchAttendanceCount = useCallback(async () => {
    try {
      setIsLoading(true);
      const { count, error } = await supabase
        .from('show_attendances')
        .select('*', { count: 'exact', head: true })
        .eq('show_id', showId);

      if (!error && count !== null) {
        setAttendanceCount(count);
        onAttendanceChange?.(count);
      }
    } catch (_error) {
    } finally {
      setIsLoading(false);
    }
  }, [showId, supabase, onAttendanceChange]);

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
    // Initial fetches
    fetchAttendanceCount();
    fetchShowStatus();

    // Subscribe to attendance changes
    const attendanceChannel = supabase
      .channel(`show-attendance-${showId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'show_attendances',
          filter: `show_id=eq.${showId}`,
        },
        (payload: RealtimePostgresChangesPayload<ShowAttendance>) => {
          if (payload.eventType === 'INSERT') {
            setAttendanceCount((prev) => {
              const newCount = prev + 1;
              onAttendanceChange?.(newCount);
              return newCount;
            });
          } else if (payload.eventType === 'DELETE') {
            setAttendanceCount((prev) => {
              const newCount = Math.max(0, prev - 1);
              onAttendanceChange?.(newCount);
              return newCount;
            });
          }
        }
      )
      .subscribe();

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
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(showChannel);
    };
  }, [
    showId,
    supabase,
    fetchAttendanceCount,
    fetchShowStatus,
    onAttendanceChange,
    onStatusChange,
  ]);

  return {
    attendanceCount,
    showStatus,
    isLoading,
    refetchAttendance: fetchAttendanceCount,
    refetchStatus: fetchShowStatus,
  };
}
