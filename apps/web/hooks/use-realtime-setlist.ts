"use client"

import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js"
import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "~/lib/supabase/client"

type SetlistSong = {
  id: string
  songId: string
  position: number
  song: {
    id: string
    title: string
    artist: string
    durationMs?: number
    albumArtUrl?: string
  }
  notes?: string
  isPlayed?: boolean
  playTime?: Date
  upvotes: number
  downvotes: number
  netVotes: number
  userVote?: "up" | "down" | null
}

type Setlist = {
  id: string
  name: string
  type: "predicted" | "actual"
  songs: SetlistSong[]
}

type RealtimeEvent = {
  type: "vote_update" | "song_played" | "setlist_update" | "connection_change"
  data?: any
  timestamp: Date
}

interface UseRealtimeSetlistOptions {
  showId: string
  onEvent?: (event: RealtimeEvent) => void
}

interface UseRealtimeSetlistReturn {
  setlists: Setlist[]
  loading: boolean
  connectionStatus: "connecting" | "connected" | "disconnected" | "error"
  isConnected: boolean
  lastUpdate: Date | null
  refetch: () => Promise<void>
}

export function useRealtimeSetlist({
  showId,
  onEvent,
}: UseRealtimeSetlistOptions): UseRealtimeSetlistReturn {
  const [setlists, setSetlists] = useState<Setlist[]>([])
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected")
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const isConnected = connectionStatus === "connected"

  // Emit events if handler provided
  const emitEvent = useCallback(
    (event: RealtimeEvent) => {
      if (onEvent) {
        onEvent(event)
      }
    },
    [onEvent]
  )

  // Fetch setlists data
  const fetchSetlists = useCallback(async () => {
    try {
      const response = await fetch(`/api/setlists/${showId}`)
      if (response.ok) {
        const data = await response.json()
        setSetlists(data.setlists || [])
        setLastUpdate(new Date())
        return data.setlists || []
      }
    } catch (error) {
      emitEvent({
        type: "connection_change",
        data: { error },
        timestamp: new Date(),
      })
    } finally {
      setLoading(false)
    }
    return []
  }, [showId, emitEvent])

  // Handle vote updates
  const handleVoteUpdate = useCallback(
    (payload: RealtimePostgresChangesPayload<any>) => {
      // Refetch to get accurate vote counts
      fetchSetlists().then(() => {
        emitEvent({
          type: "vote_update",
          data: payload,
          timestamp: new Date(),
        })
      })
    },
    [fetchSetlists, emitEvent]
  )

  // Handle setlist song updates
  const handleSetlistSongUpdate = useCallback(
    (payload: RealtimePostgresChangesPayload<any>) => {
      if (payload.eventType === "UPDATE") {
        setSetlists((prev) =>
          prev.map((setlist) => ({
            ...setlist,
            songs: setlist.songs.map((song) =>
              song.id === payload.new.id
                ? ({
                    ...song,
                    isPlayed: payload.new["is_played"] ?? song.isPlayed,
                    playTime: payload.new["play_time"]
                      ? new Date(payload.new["play_time"])
                      : song.playTime,
                    notes: payload.new["notes"] ?? song.notes,
                  } as SetlistSong)
                : song
            ),
          }))
        )

        setLastUpdate(new Date())

        // Check if a song was just marked as played
        if (payload.new["is_played"] && !payload.old["is_played"]) {
          emitEvent({
            type: "song_played",
            data: {
              songId: payload.new.id,
              playTime: payload.new.play_time,
            },
            timestamp: new Date(),
          })
        } else {
          emitEvent({
            type: "setlist_update",
            data: payload,
            timestamp: new Date(),
          })
        }
      }
    },
    [emitEvent]
  )

  // Setup real-time subscription with reconnection logic
  const setupSubscription = useCallback(async () => {
    if (!showId || setlists.length === 0) {
      return
    }

    // Clean up existing subscription
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    setConnectionStatus("connecting")

    try {
      const setlistIds = setlists.map((s) => s.id)
      const setlistSongIds = setlists.flatMap((s) =>
        s.songs.map((song) => song.id)
      )

      const channel = supabase
        .channel(`setlist-${showId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "votes",
            filter: `setlist_song_id=in.(${setlistSongIds.join(",")})`,
          },
          handleVoteUpdate
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "setlist_songs",
            filter: `setlist_id=in.(${setlistIds.join(",")})`,
          },
          handleSetlistSongUpdate
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "setlists",
            filter: `show_id=eq.${showId}`,
          },
          () => {
            // Refetch when setlist structure changes
            fetchSetlists()
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setConnectionStatus("connected")
            reconnectAttemptsRef.current = 0
            emitEvent({
              type: "connection_change",
              data: { status: "connected" },
              timestamp: new Date(),
            })
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            setConnectionStatus("error")
            handleReconnect()
          } else if (status === "TIMED_OUT") {
            setConnectionStatus("disconnected")
            handleReconnect()
          }
        })

      channelRef.current = channel
    } catch (_error) {
      setConnectionStatus("error")
      handleReconnect()
    }
  }, [
    showId,
    setlists,
    supabase,
    handleVoteUpdate,
    handleSetlistSongUpdate,
    fetchSetlists,
    emitEvent,
  ])

  // Reconnection logic with exponential backoff
  const handleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000)
    reconnectAttemptsRef.current += 1

    reconnectTimeoutRef.current = setTimeout(() => {
      setupSubscription()
    }, delay)
  }, [setupSubscription])

  // Initial data fetch
  useEffect(() => {
    fetchSetlists()
  }, [fetchSetlists])

  // Setup subscription when setlists are loaded
  useEffect(() => {
    if (setlists.length > 0) {
      setupSubscription()
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [setlists.length, setupSubscription, supabase])

  return {
    setlists,
    loading,
    connectionStatus,
    isConnected,
    lastUpdate,
    refetch: fetchSetlists,
  }
}
