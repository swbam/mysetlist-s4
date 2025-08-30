import { Badge } from "@repo/design-system";
import { Button } from "@repo/design-system";
import {
  Card,
  CardContent,
  CardHeader,
} from "@repo/design-system";
import {
  Calendar,
  ChevronRight,
  Heart,
  MapPin,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createConvexClient } from "~/lib/database";
import { api } from "~/lib/convex-api";

// Server component to fetch real data from Convex
async function getFeaturedData() {
  const convex = createConvexClient();

  try {
    // Get all featured data from Convex
    const [artists, shows, venues] = await Promise.all([
      convex.query(api.artists.getTrending, { limit: 3 }),
      convex.query(api.shows.getUpcoming, { limit: 2 }),
      convex.query(api.venues.getAll, { limit: 3 }),
    ]);

    return { artists: artists || [], shows: shows || [], venues: venues || [] };
  } catch (error) {
    console.error("Failed to fetch featured data:", error);
    return { artists: [], shows: [], venues: [] };
  }
}

export async function FeaturedContent() {
  const { artists, shows, venues } = await getFeaturedData();

  return (
    <div className="space-y-16">
      {/* Featured Artists */}
      {artists.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-3xl tracking-tight">
                🔥 Trending Artists
              </h2>
              <p className="text-muted-foreground">
                Artists gaining momentum with upcoming shows
              </p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/artists" className="group">
                View all
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {artists.map((artist) => (
              <Card
                key={artist._id}
                className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg"
              >
                <Link href={`/artists/${artist.slug}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      {artist.images?.[0] && (
                        <div className="relative h-12 w-12 overflow-hidden rounded-full">
                          <Image
                            src={artist.images[0]}
                            alt={artist.name}
                            fill
                            className="object-cover transition-transform group-hover:scale-110"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-lg">
                          {artist.name}
                        </h3>
                        {artist.genres && artist.genres.length > 0 && (
                          <p className="truncate text-muted-foreground text-sm">
                            {artist.genres.slice(0, 2).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        <span>Score: {Math.round(artist.trendingScore || 0)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span>{(artist.followers || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        <Calendar className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="mr-1 h-3 w-3" />
                        {artist.popularity || 0}% popular
                      </Badge>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Featured Shows */}
      {shows.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-3xl tracking-tight">
                🎤 Hottest Shows
              </h2>
              <p className="text-muted-foreground">
                Most anticipated upcoming concerts
              </p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/shows" className="group">
                View all
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {shows.map((show) => (
              <Card
                key={show._id}
                className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg"
              >
                <Link href={`/shows/${show.slug || show._id}`}>
                  <CardHeader className="pb-3">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg group-hover:text-primary">
                        {show.artist?.name || "Unknown Artist"} 
                        {show.venue?.name && ` at ${show.venue.name}`}
                      </h3>
                      <div className="flex items-center space-x-2 text-muted-foreground text-sm">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(show.date).toLocaleDateString()}</span>
                        {show.venue && (
                          <>
                            <span>•</span>
                            <MapPin className="h-4 w-4" />
                            <span>{show.venue.city}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span>0 votes</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-green-500" />
                        <span>0 attending</span>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Featured Venues */}
      {venues.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-3xl tracking-tight">
                🏟️ Popular Venues
              </h2>
              <p className="text-muted-foreground">
                The hottest concert venues right now
              </p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/venues" className="group">
                View all
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6">
            {venues.map((venue) => (
              <Card
                key={venue._id}
                className="group cursor-pointer transition-all hover:shadow-lg"
              >
                <Link href={`/venues/${venue._id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg group-hover:text-primary">
                          {venue.name}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {venue.city}
                          {venue.state && `, ${venue.state}`}
                          {venue.country && `, ${venue.country}`}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <span>Active</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4 text-purple-500" />
                          <span>{venue.capacity?.toLocaleString() || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}