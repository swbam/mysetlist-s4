import { artistStats, artists, db, shows } from "~/lib/database";
import { Badge } from "@repo/design-system";
import { Card, CardContent } from "@repo/design-system";
import { desc, eq, sql } from "drizzle-orm";
import { Calendar, Music, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface PopularArtistsGridProps {
  userId?: string; // userId not used anymore, kept for compatibility
}

export async function FollowedArtistsGrid({ userId }: PopularArtistsGridProps) {
  // Show popular artists instead of followed artists since userFollowsArtists table doesn't exist
  const popularArtists = await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      genres: artists.genres,
      totalShows: artistStats.totalShows,
      followerCount: artists.followerCount,
      upcomingShows: sql<number>`count(distinct ${shows.id})`,
      trendingScore: artists.trendingScore,
    })
    .from(artists)
    .leftJoin(artistStats, eq(artists.id, artistStats.artistId))
    .leftJoin(shows, eq(artists.id, shows.headlinerArtistId))
    .groupBy(
      artists.id,
      artistStats.totalShows,
      artists.followerCount,
      artists.trendingScore,
    )
    .orderBy(desc(artists.trendingScore))
    .limit(20);

  if (popularArtists.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Music className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-semibold text-lg">
            No popular artists found
          </h3>
          <p className="mb-4 text-muted-foreground">
            Check back later for trending artists and their upcoming shows
          </p>
          <Link href="/artists" className="text-primary hover:underline">
            Browse Artists
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {popularArtists.map((artist) => (
        <Card key={artist.id} className="transition-shadow hover:shadow-lg">
          <Link href={`/artists/${artist.slug}`}>
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                  {artist.imageUrl ? (
                    <Image
                      src={artist.imageUrl}
                      alt={artist.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 200px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Music className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-lg">
                    {artist.name}
                  </h3>

                  {artist.genres && (
                    <div className="mt-1 mb-3 flex gap-1">
                      {(() => {
                        try {
                          const genres = JSON.parse(artist.genres);
                          return (
                            Array.isArray(genres) &&
                            genres.slice(0, 2).map((genre) => (
                              <Badge
                                key={genre}
                                variant="secondary"
                                className="text-xs"
                              >
                                {genre}
                              </Badge>
                            ))
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-muted-foreground text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{artist.upcomingShows} upcoming</span>
                    </div>
                    {artist.followerCount && artist.followerCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>
                          {artist.followerCount.toLocaleString()} followers
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  );
}
