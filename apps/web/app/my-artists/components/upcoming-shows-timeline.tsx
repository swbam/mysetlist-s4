import { artists, db, shows, venues } from "@repo/database"
import { Button } from "@repo/design-system/components/ui/button"
import { Card, CardContent } from "@repo/design-system/components/ui/card"
import { format, isThisWeek, isToday, isTomorrow } from "date-fns"
import { asc, desc, eq, gte } from "drizzle-orm"
import { Calendar, Clock, MapPin, Music, Ticket } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface UpcomingShowsTimelineProps {
  userId?: string // userId not used anymore, kept for compatibility
}

export async function UpcomingShowsTimeline({
  userId,
}: UpcomingShowsTimelineProps) {
  // Show popular upcoming shows instead of followed artists' shows
  const upcomingShows = await db
    .select({
      id: shows.id,
      name: shows.name,
      slug: shows.slug,
      date: shows.date,
      startTime: shows.startTime,
      ticketUrl: shows.ticketUrl,
      artist: {
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
        imageUrl: artists.imageUrl,
      },
      venue: {
        id: venues.id,
        name: venues.name,
        city: venues.city,
        state: venues.state,
      },
    })
    .from(shows)
    .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(gte(shows.date, new Date().toISOString().substring(0, 10)))
    .orderBy(asc(shows.date), desc(artists.trendingScore))
    .limit(10)

  if (upcomingShows.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-semibold text-lg">No upcoming shows</h3>
          <p className="text-muted-foreground">
            No upcoming shows scheduled at the moment
          </p>
        </CardContent>
      </Card>
    )
  }

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString)
    if (isToday(date)) {
      return "Today"
    }
    if (isTomorrow(date)) {
      return "Tomorrow"
    }
    if (isThisWeek(date)) {
      return format(date, "EEEE")
    }
    return format(date, "MMM d")
  }

  const getDateColor = (dateString: string) => {
    const date = new Date(dateString)
    if (isToday(date)) {
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
    }
    if (isTomorrow(date)) {
      return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
    }
    if (isThisWeek(date)) {
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
    }
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
  }

  return (
    <div className="space-y-4">
      {upcomingShows.map((show) => (
        <Card
          key={show.id}
          className="overflow-hidden transition-shadow hover:shadow-lg"
        >
          <CardContent className="p-0">
            <div className="flex">
              {/* Date Badge */}
              <div
                className={`flex w-24 flex-col items-center justify-center p-4 ${getDateColor(show.date)}`}
              >
                <div className="font-bold text-2xl">
                  {format(new Date(show.date), "d")}
                </div>
                <div className="text-sm uppercase">
                  {format(new Date(show.date), "MMM")}
                </div>
                <div className="mt-1 text-xs">{getDateLabel(show.date)}</div>
              </div>

              {/* Show Details */}
              <div className="flex-1 p-6">
                <div className="flex items-start gap-4">
                  <Link
                    href={`/artists/${show.artist.slug}`}
                    className="flex-shrink-0"
                  >
                    <div className="relative h-12 w-12 overflow-hidden rounded-full bg-muted">
                      {show.artist.imageUrl ? (
                        <Image
                          src={show.artist.imageUrl}
                          alt={show.artist.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Music className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link href={`/shows/${show.slug}`}>
                      <h3 className="font-semibold transition-colors hover:text-primary">
                        {show.name || `${show.artist.name} Live`}
                      </h3>
                    </Link>

                    <p className="mb-2 text-muted-foreground text-sm">
                      {show.artist.name}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      {show.startTime && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{show.startTime}</span>
                        </div>
                      )}

                      {show.venue && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {show.venue.name}
                            {show.venue.city && `, ${show.venue.city}`}
                            {show.venue.state && `, ${show.venue.state}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {show.ticketUrl && (
                    <Button size="sm" variant="default" asChild>
                      <a
                        href={show.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        <Ticket className="h-3 w-3" />
                        Tickets
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="pt-4 text-center">
        <Button variant="outline" asChild>
          <Link href="/shows">View All Shows</Link>
        </Button>
      </div>
    </div>
  )
}
