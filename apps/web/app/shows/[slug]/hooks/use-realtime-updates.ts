"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "~/lib/supabase/client";

export function useRealtimeUpdates(showId: string, isLive: boolean) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!isLive) {
      return;
    }

    // Subscribe to setlist updates
    const setlistChannel = supabase
      .channel(`show-setlists-${showId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "setlist_songs",
          filter: `setlist_id=in.(select id from setlists where showId=eq.${showId})`,
        },
        (_payload) => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(setlistChannel);
    };
  }, [showId, isLive, router, supabase]);
}
