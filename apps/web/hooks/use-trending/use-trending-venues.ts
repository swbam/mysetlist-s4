"use client"

import { useCallback, useEffect, useState } from "react"
import type { TrendingVenue, TrendingVenuesResponse } from "~/types/api"

export interface UseTrendingVenuesOptions {
  timeframe?: "day" | "week" | "month"
  limit?: number
  city?: string
  state?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useTrendingVenues(options: UseTrendingVenuesOptions = {}) {
  const {
    timeframe = "week",
    limit = 20,
    city,
    state,
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000, // 5 minutes
  } = options

  const [venues, setVenues] = useState<TrendingVenue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVenues = useCallback(async () => {
    try {
      setError(null)
      const params = new URLSearchParams({
        timeframe,
        limit: limit.toString(),
      })

      // Add optional filters
      if (city) {
        params.append("city", city)
      }
      if (state) {
        params.append("state", state)
      }

      const response = await fetch(`/api/trending/venues?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch trending venues")
      }

      const data: TrendingVenuesResponse = await response.json()
      setVenues(data.venues || [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load trending venues"
      )
    } finally {
      setLoading(false)
    }
  }, [timeframe, limit, city, state])

  useEffect(() => {
    fetchVenues()
  }, [fetchVenues])

  useEffect(() => {
    if (!autoRefresh) {
      return
    }

    const interval = setInterval(fetchVenues, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchVenues])

  return {
    venues,
    loading,
    error,
    refetch: fetchVenues,
  }
}

// Hook for venue statistics
export function useVenueStats(venueId: string) {
  const [stats, setStats] = useState({
    totalShows: 0,
    upcomingShows: 0,
    averageAttendance: 0,
    popularGenres: [] as string[],
    trendingScore: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!venueId) {
      return
    }

    try {
      setError(null)
      // This would typically fetch from a dedicated venue stats endpoint
      // For now, we'll use the trending venues endpoint to get basic info
      const response = await fetch("/api/trending/venues?limit=100")
      if (!response.ok) {
        throw new Error("Failed to fetch venue stats")
      }

      const data: TrendingVenuesResponse = await response.json()
      const venue = data.venues.find((v) => v.id === venueId)

      if (venue) {
        setStats({
          totalShows: venue.totalShows || 0,
          upcomingShows: venue.upcomingShows || 0,
          averageAttendance: Math.floor(Math.random() * 1000), // Simulated
          popularGenres: ["Rock", "Pop", "Alternative"], // Simulated
          trendingScore: venue.trendingScore || 0,
        })
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load venue stats"
      )
    } finally {
      setLoading(false)
    }
  }, [venueId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  }
}
