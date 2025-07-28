"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar"
import { Badge } from "@repo/design-system/components/ui/badge"
import { Button } from "@repo/design-system/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card"
import { Skeleton } from "@repo/design-system/components/ui/skeleton"
import { cn } from "@repo/design-system/lib/utils"
import {
  Activity,
  Calendar,
  Eye,
  Flame,
  MapPin,
  Music,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import React, { useCallback, useEffect, useState } from "react"

interface LiveTrendingItem {
  id: string
  type: "artist" | "show" | "venue"
  name: string
  slug: string
  imageUrl?: string
  score: number
  metrics: {
    searches: number
    views: number
    interactions: number
    growth: number
  }
  timeframe: "1h" | "6h" | "24h"
}

interface LiveTrendingProps {
  timeframe?: "1h" | "6h" | "24h"
  type?: "artist" | "show" | "venue" | "all"
  limit?: number
  autoRefresh?: boolean
  className?: string
}

// Memoized trending item component for better performance
const TrendingItem = React.memo(function TrendingItem({
  item,
  index,
  getIcon,
  getLink,
  getGrowthColor,
  getGrowthIcon,
}: {
  item: LiveTrendingItem
  index: number
  getIcon: (type: LiveTrendingItem["type"]) => React.ReactNode
  getLink: (item: LiveTrendingItem) => string
  getGrowthColor: (growth: number) => string
  getGrowthIcon: (growth: number) => typeof TrendingUp
}) {
  const GrowthIcon = getGrowthIcon(item.metrics.growth)

  return (
    <div className="flex items-center gap-4 rounded-lg border p-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
      {/* Rank */}
      <div className="w-8 font-bold text-2xl text-muted-foreground">
        {index + 1}
      </div>

      {/* Avatar/Icon */}
      <Avatar className="h-12 w-12">
        {item.imageUrl ? (
          <AvatarImage src={item.imageUrl} alt={item.name} />
        ) : (
          <AvatarFallback>{getIcon(item.type)}</AvatarFallback>
        )}
      </Avatar>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <Link
            href={getLink(item)}
            className="truncate font-semibold hover:underline"
          >
            {item.name}
          </Link>
          <Badge variant="outline" className="text-xs">
            {item.type}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-muted-foreground text-xs">
          <span className="flex items-center gap-1">
            <Search className="h-3 w-3" />
            {item.metrics.searches}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {item.metrics.views}
          </span>
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {item.metrics.interactions}
          </span>
        </div>
      </div>

      {/* Score & Growth */}
      <div className="text-right">
        <div className="flex items-center gap-1 font-medium text-sm">
          <GrowthIcon
            className={cn("h-3 w-3", getGrowthColor(item.metrics.growth))}
          />
          <span className={getGrowthColor(item.metrics.growth)}>
            {item.metrics.growth > 0 ? "+" : ""}
            {item.metrics.growth.toFixed(1)}%
          </span>
        </div>
        <div className="text-muted-foreground text-xs">
          Score: {item.score.toFixed(0)}
        </div>
      </div>
    </div>
  )
})

export const LiveTrending = React.memo(function LiveTrending({
  timeframe = "24h",
  type = "all",
  limit = 10,
  autoRefresh = true,
  className,
}: LiveTrendingProps) {
  const [trending, setTrending] = useState<LiveTrendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchTrending = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      try {
        const params = new URLSearchParams({
          timeframe,
          limit: limit.toString(),
          ...(type !== "all" && { type }),
        })

        const response = await fetch(`/api/trending/live?${params}`)
        if (!response.ok) {
          throw new Error("Failed to fetch trending data")
        }

        const data = await response.json()
        setTrending(data.trending)
        setLastUpdate(new Date())
      } catch (_err) {
        setError("Failed to load trending data")
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    [timeframe, type, limit]
  )

  useEffect(() => {
    fetchTrending()
  }, [fetchTrending])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) {
      return
    }

    const interval = setInterval(
      () => {
        fetchTrending(true)
      },
      5 * 60 * 1000
    ) // 5 minutes

    return () => clearInterval(interval)
  }, [autoRefresh, fetchTrending])

  const getIcon = useCallback((itemType: LiveTrendingItem["type"]) => {
    switch (itemType) {
      case "artist":
        return <Music className="h-4 w-4" />
      case "show":
        return <Calendar className="h-4 w-4" />
      case "venue":
        return <MapPin className="h-4 w-4" />
    }
  }, [])

  const getLink = useCallback((item: LiveTrendingItem) => {
    switch (item.type) {
      case "artist":
        return `/artists/${item.slug}`
      case "show":
        return `/shows/${item.slug}`
      case "venue":
        return `/venues/${item.slug}`
    }
  }, [])

  const getGrowthColor = useCallback((growth: number) => {
    if (growth > 20) {
      return "text-red-500"
    }
    if (growth > 10) {
      return "text-orange-500"
    }
    if (growth > 0) {
      return "text-green-500"
    }
    return "text-gray-500"
  }, [])

  const getGrowthIcon = useCallback((growth: number) => {
    return growth >= 0 ? TrendingUp : TrendingDown
  }, [])

  const formatTimeframe = (tf: string) => {
    switch (tf) {
      case "1h":
        return "Last Hour"
      case "6h":
        return "Last 6 Hours"
      case "24h":
        return "Last 24 Hours"
      default:
        return tf
    }
  }

  if (loading && !isRefreshing) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Live Trending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 font-bold text-2xl text-muted-foreground">
                  {i + 1}
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="space-y-1 text-right">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Live Trending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <p className="mb-4 text-muted-foreground">{error}</p>
            <Button onClick={() => fetchTrending()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Live Trending
            <Badge variant="outline" className="ml-2">
              {formatTimeframe(timeframe)}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-muted-foreground text-xs">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchTrending(true)}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefreshing && "animate-spin")}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {trending.map((item, index) => (
            <TrendingItem
              key={item.id}
              item={item}
              index={index}
              getIcon={getIcon}
              getLink={getLink}
              getGrowthColor={getGrowthColor}
              getGrowthIcon={getGrowthIcon}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
})
