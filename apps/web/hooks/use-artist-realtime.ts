"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

export interface ArtistRealtimeData {
  artist?: any;
  shows?: any[];
  songs?: any[];
  stats?: any;
  followers?: number;
  isLoading: boolean;
  error?: string;
}

// Client-side Supabase client creation
const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase environment variables not found, realtime features disabled");
    return null;
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
};

export function useArtistRealtime(
  artistId: string,
  initialData: ArtistRealtimeData,
) {
  const [data, setData] = useState<ArtistRealtimeData>(initialData);
  const [syncProgress, setSyncProgress] = useState<{
    isImporting: boolean;
    stage: string;
    progress: number;
  }>({
    isImporting: false,
    stage: "idle",
    progress: 0,
  });

  // Function to refresh artist data from server
  const refreshArtistData = useCallback(async () => {
    try {
      setData((prev) => ({ ...prev, isLoading: true, error: undefined }));

      const [artistRes, showsRes, statsRes] = await Promise.allSettled([
        fetch(`/api/artists/${artistId}`),
        fetch(`/api/artists/${artistId}/shows`),
        fetch(`/api/artists/${artistId}/stats`),
      ]);

      const updates: Partial<ArtistRealtimeData> = { isLoading: false };

      if (artistRes.status === "fulfilled" && artistRes.value.ok) {
        const artistData = await artistRes.value.json();
        updates.artist = artistData;
      }

      if (showsRes.status === "fulfilled" && showsRes.value.ok) {
        const showsData = await showsRes.value.json();
        updates.shows = showsData;
      }

      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        const statsData = await statsRes.value.json();
        updates.stats = statsData;
      }

      setData((prev) => ({ ...prev, ...updates }));
    } catch (error) {
      console.error("Failed to refresh artist data:", error);
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to refresh data",
      }));
    }
  }, [artistId]);

  // Subscribe to artist updates
  useEffect(() => {
    const supabase = createSupabaseClient();
    
    // If no supabase client, skip realtime features
    if (!supabase) {
      console.warn("Realtime features disabled - missing Supabase configuration");
      return;
    }

    // Subscribe to artist followers updates
    const artistFollowersChannelName = `artist_followers:${artistId}`;
    const artistFollowersChannel = supabase
      .channel(artistFollowersChannelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_follows_artists",
          filter: `artist_id=eq.${artistId}`,
        },
        (payload: any) => {
          if (payload.eventType === "UPDATE" && payload.new) {
            setData((prev) => ({
              ...prev,
              artist: { ...prev.artist, ...payload.new },
              followers: payload.new.followerCount || prev.followers,
            }));
          } else if (payload.eventType === "INSERT") {
            // New data imported, refresh everything
            refreshArtistData();
            setSyncProgress((prev) => ({
              ...prev,
              isImporting: false,
              stage: "completed",
            }));
          }
        },
      )
      .subscribe();

    // Subscribe to shows updates for this artist
    const showsChannelName = `artist_shows:${artistId}`;
    const showsChannel = supabase
      .channel(showsChannelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "show_artists",
          filter: `artist_id=eq.${artistId}`,
        },
        (payload: any) => {
          // Refresh shows data when artist's shows change
          refreshArtistData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "artists",
          filter: `id=eq.${artistId}`,
        },
        (payload: any) => {
          if (payload.new) {
            setData((prev) => ({
              ...prev,
              artist: { ...prev.artist, ...payload.new },
            }));

            // Check if this is a sync completion
            if (payload.new.lastSyncedAt && !payload.old?.lastSyncedAt) {
              setSyncProgress((prev) => ({
                ...prev,
                isImporting: false,
                stage: "completed",
              }));
              refreshArtistData(); // Full refresh on sync completion
            }
          }
        },
      )
      .subscribe();

    // Check for ongoing sync jobs
    const checkSyncStatus = async () => {
      try {
        const response = await fetch(`/api/sync/status?artistId=${artistId}`);
        if (response.ok) {
          const syncData = await response.json();
          if (syncData.isActive || syncData.isImporting) {
            setSyncProgress({
              isImporting: true,
              stage: syncData.stage || syncData.currentStage || "importing",
              progress: syncData.progress || 0,
            });
          }
        }
      } catch (error) {
        // Silent fail for sync status check
      }
    };

    checkSyncStatus();

    // Cleanup subscriptions
    return () => {
      if (supabase) {
        supabase.removeChannel(artistFollowersChannel);
        supabase.removeChannel(showsChannel);
      }
    };
  }, [artistId, refreshArtistData]);

  // Handle sync progress updates via polling (fallback if realtime fails)
  useEffect(() => {
    if (!syncProgress.isImporting) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/sync/status?artistId=${artistId}`);
        if (response.ok) {
          const syncData = await response.json();

          // Check if sync just completed before updating state
          const wasImporting = syncProgress.isImporting;

          setSyncProgress((prev) => ({
            ...prev,
            stage: syncData.currentStage || prev.stage,
            progress: syncData.progress || prev.progress,
            isImporting: syncData.isActive,
          }));

          // If sync completed, refresh data
          if (!syncData.isActive && wasImporting) {
            refreshArtistData();
          }
        }
      } catch (error) {
        // Silent fail for sync progress check
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [syncProgress.isImporting, artistId, refreshArtistData]);

  return {
    data,
    syncProgress,
    refreshData: refreshArtistData,
    isConnected: true, // Simplified for now, could check supabase connection if needed
  };
}
