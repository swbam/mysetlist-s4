"use client"

import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import { useCallback, useEffect, useState } from "react"
import { createClient } from "~/lib/supabase/client"

interface ArtistFollower {
  artist_id: string
  user_id: string
  created_at: string
}

interface UseRealtimeArtistOptions {
  artistId: string
  initialFollowerCount?: number
  onFollowerChange?: (count: number) => void
}

export function useRealtimeArtist({
  artistId,
  initialFollowerCount = 0,
  onFollowerChange,
}: UseRealtimeArtistOptions) {
  const [followerCount, setFollowerCount] = useState(initialFollowerCount)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  // Fetch current follower count
  const fetchFollowerCount = useCallback(async () => {
    try {
      setIsLoading(true)
      const { count, error } = await supabase
        .from("user_follows_artists")
        .select("*", { count: "exact", head: true })
        .eq("artist_id", artistId)

      if (!error && count !== null) {
        setFollowerCount(count)
        onFollowerChange?.(count)
      }
    } catch (_error) {
    } finally {
      setIsLoading(false)
    }
  }, [artistId, supabase, onFollowerChange])

  useEffect(() => {
    // Initial fetch
    fetchFollowerCount()

    // Subscribe to follower changes
    const channel = supabase
      .channel(`artist-followers-${artistId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_follows_artists",
          filter: `artist_id=eq.${artistId}`,
        },
        (payload: RealtimePostgresChangesPayload<ArtistFollower>) => {
          if (payload.eventType === "INSERT") {
            setFollowerCount((prev) => {
              const newCount = prev + 1
              onFollowerChange?.(newCount)
              return newCount
            })
          } else if (payload.eventType === "DELETE") {
            setFollowerCount((prev) => {
              const newCount = Math.max(0, prev - 1)
              onFollowerChange?.(newCount)
              return newCount
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [artistId, supabase, fetchFollowerCount, onFollowerChange])

  return {
    followerCount,
    isLoading,
    refetch: fetchFollowerCount,
  }
}
