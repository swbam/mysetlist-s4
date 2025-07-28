"use client"

import { Badge } from "@repo/design-system/components/ui/badge"
import { Button } from "@repo/design-system/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@repo/design-system/components/ui/card"
import { Skeleton } from "@repo/design-system/components/ui/skeleton"
import { format } from "date-fns"
import {
  Calendar,
  Heart,
  MapPin,
  Music,
  Star,
  Ticket,
  Users,
} from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { type ShowWithDetails, fetchShows } from "../actions"

export const ShowsList = () => {
  const [shows, setShows] = useState<ShowWithDetails[]>([])
  const [savedShows, setSavedShows] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    const loadShows = async () => {
      setLoading(true)
      try {
        const city = searchParams.get("city") || undefined
        const dateFrom = searchParams.get("dateFrom") || undefined
        const dateTo = searchParams.get("dateTo") || undefined
        const orderBy =
          (searchParams.get("orderBy") as "date" | "trending" | "popularity") ||
          "date"

        const { shows: fetchedShows } = await fetchShows({
          status: "upcoming",
          ...(city && { city }),
          ...(dateFrom && { dateFrom }),
          ...(dateTo && { dateTo }),
          orderBy,
          limit: 20,
        })

        setShows(fetchedShows)
      } catch (_error) {
      } finally {
        setLoading(false)
      }
    }

    loadShows()
  }, [searchParams])

  const toggleSave = (showId: string) => {
    setSavedShows((prev) =>
      prev.includes(showId)
        ? prev.filter((id) => id !== showId)
        : [...prev, showId]
    )
  }

  const getAttendancePercentage = (
    attending: number,
    capacity: number | null
  ) => {
    if (!capacity || capacity === 0) {
      return 0
    }
    return Math.round((attending / capacity) * 100)
  }

  const formatPrice = (
    minPrice: number | null,
    maxPrice: number | null,
    currency: string
  ) => {
    if (!minPrice) {
      return "Price TBA"
    }
    const currencySymbol = currency === "USD" ? "$" : currency
    if (maxPrice && maxPrice !== minPrice) {
      return `${currencySymbol}${minPrice}-${currencySymbol}${maxPrice}`
    }
    return `${currencySymbol}${minPrice}+`
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-8 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex items-end justify-end gap-4">
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (shows.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Music className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 font-semibold text-lg">No shows found</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters or check back later for new shows.
        </p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {shows.map((show) => {
        const attendancePercentage = show.venue?.capacity
          ? getAttendancePercentage(show.attendeeCount, show.venue.capacity)
          : 0
        const mainGenre = show.headlinerArtist.genres?.[0] || "Live Music"

        return (
          <Card
            key={show.id}
            className="overflow-hidden transition-shadow hover:shadow-lg"
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Link href={`/shows/${show.slug}`}>
                    <h3 className="font-semibold text-2xl transition-colors hover:text-primary">
                      {show.headlinerArtist.name}
                    </h3>
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    {show.name !== show.headlinerArtist.name && (
                      <p className="text-muted-foreground text-sm">
                        {show.name}
                      </p>
                    )}
                    {show.headlinerArtist.verified && (
                      <Star className="h-4 w-4 fill-current text-primary" />
                    )}
                  </div>
                  {show.supportingArtists.length > 0 && (
                    <p className="mt-1 text-muted-foreground text-sm">
                      with{" "}
                      {show.supportingArtists
                        .map((sa) => sa.artist.name)
                        .join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{mainGenre}</Badge>
                  {show.isFeatured && <Badge variant="default">Featured</Badge>}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleSave(show.id)}
                  >
                    <Heart
                      className={`h-4 w-4 ${savedShows.includes(show.id) ? "fill-current text-red-500" : ""}`}
                    />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  {show.venue && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{show.venue.name}</span>
                      <span className="text-muted-foreground">
                        • {show.venue.city}
                        {show.venue.state ? `, ${show.venue.state}` : ""},{" "}
                        {show.venue.country}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(show.date), "EEEE, MMMM d, yyyy")}
                    </span>
                    {show.startTime && (
                      <span className="text-muted-foreground">
                        • {show.startTime}
                      </span>
                    )}
                  </div>
                  {show.venue?.capacity && show.venue.capacity > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <span>
                          {show.attendeeCount.toLocaleString()} interested
                        </span>
                        {attendancePercentage > 0 && (
                          <Badge
                            variant={
                              attendancePercentage > 90
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {attendancePercentage}% full
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-end justify-end gap-4">
                  <div className="text-right">
                    <p className="text-muted-foreground text-sm">
                      {show.minPrice ? "Starting from" : ""}
                    </p>
                    <p className="font-semibold text-2xl">
                      {formatPrice(show.minPrice, show.maxPrice, show.currency)}
                    </p>
                  </div>
                  <Button
                    asChild
                    disabled={!show.ticketUrl || show.status === "cancelled"}
                    className="gap-2"
                  >
                    {show.ticketUrl ? (
                      <a
                        href={show.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Ticket className="h-4 w-4" />
                        {show.status === "cancelled"
                          ? "Cancelled"
                          : "Get Tickets"}
                      </a>
                    ) : (
                      <span>
                        <Ticket className="h-4 w-4" />
                        Tickets TBA
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
