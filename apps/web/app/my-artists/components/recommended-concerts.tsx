import {
  artistStats,
  artists,
  db,
  shows,
  userFollowsArtists,
  venues,
} from '@repo/database';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { format } from 'date-fns';
import { and, desc, eq, gte, ne, sql } from 'drizzle-orm';
import { Calendar, MapPin, Music, Sparkles, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface RecommendedConcertsProps {
  userId: string;
}

export async function RecommendedConcerts({
  userId,
}: RecommendedConcertsProps) {
  // Get user's followed artists
  const followedArtistIds = await db
    .select({ artistId: userFollowsArtists.artistId })
    .from(userFollowsArtists)
    .where(eq(userFollowsArtists.userId, userId));

  const artistIds = followedArtistIds.map((f) => f.artistId);

  // Get recommendations based on:
  // 1. Similar artists to those they follow
  // 2. Trending artists they don't follow
  // 3. Popular artists in their area

  // For now, let's get trending artists they don't follow
  const recommendedShows = await db
    .select({
      id: shows.id,
      name: shows.name,
      slug: shows.slug,
      date: shows.date,
      artist: {
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
        imageUrl: artists.imageUrl,
        genres: artists.genres,
      },
      venue: {
        name: venues.name,
        city: venues.city,
        state: venues.state,
      },
      trendingScore: artistStats.trendingScore,
      followerCount: artistStats.followerCount,
    })
    .from(shows)
    .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .leftJoin(artistStats, eq(artists.id, artistStats.artistId))
    .where(
      and(
        gte(shows.date, new Date()),
        artistIds.length > 0
          ? ne(artists.id, sql`ANY(${artistIds})`)
          : undefined
      )
    )
    .orderBy(desc(artistStats.trendingScore))
    .limit(5);

  if (recommendedShows.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            No recommendations available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {recommendedShows.map((show) => (
        <Card key={show.id} className="transition-shadow hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Link
                href={`/artists/${show.artist.slug}`}
                className="flex-shrink-0"
              >
                <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted">
                  {show.artist.imageUrl ? (
                    <Image
                      src={show.artist.imageUrl}
                      alt={show.artist.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Music className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </Link>

              <div className="min-w-0 flex-1">
                <Link href={`/shows/${show.slug}`}>
                  <h4 className="truncate font-medium text-sm transition-colors hover:text-primary">
                    {show.artist.name}
                  </h4>
                </Link>

                <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
                  <Calendar className="h-3 w-3" />
                  <span>{format(show.date, 'MMM d')}</span>
                </div>

                {show.venue && (
                  <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">
                      {show.venue.city && show.venue.state
                        ? `${show.venue.city}, ${show.venue.state}`
                        : show.venue.name}
                    </span>
                  </div>
                )}

                {show.artist.genres && show.artist.genres.length > 0 && (
                  <div className="mt-2 flex gap-1">
                    {show.artist.genres.slice(0, 2).map((genre) => (
                      <Badge
                        key={genre}
                        variant="secondary"
                        className="px-2 py-0 text-xs"
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}

                {show.trendingScore && show.trendingScore > 0.7 && (
                  <div className="mt-2 flex items-center gap-1 text-orange-600 text-xs dark:text-orange-400">
                    <TrendingUp className="h-3 w-3" />
                    <span>Trending</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-muted/50">
        <CardContent className="p-4 text-center">
          <p className="mb-3 text-muted-foreground text-sm">
            Discover more artists based on your taste
          </p>
          <Button size="sm" variant="outline" asChild>
            <Link href="/artists">Browse All Artists</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
