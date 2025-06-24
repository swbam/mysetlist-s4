'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function useRealtimeUpdates(showId: string, isLive: boolean) {
  const router = useRouter();
  const supabase = createClient();
  
  useEffect(() => {
    if (!isLive) return;
    
    // Subscribe to setlist updates
    const setlistChannel = supabase
      .channel(`show-setlists-${showId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'setlist_songs',
          filter: `setlist_id=in.(select id from setlists where show_id=eq.${showId})`,
        },
        (payload) => {
          console.log('Setlist update:', payload);
          router.refresh();
        }
      )
      .subscribe();
      
    // Subscribe to attendance updates
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
        (payload) => {
          console.log('Attendance update:', payload);
          router.refresh();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(setlistChannel);
      supabase.removeChannel(attendanceChannel);
    };
  }, [showId, isLive, router, supabase]);
}