import {
  artistStats,
  artists,
  db,
  shows,
  userFollowsArtists,
} from '@repo/database';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { Calendar, Music, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface FollowedArtistsGridProps {
  userId: string;
}

export async function FollowedArtistsGrid({
  userId,
}: FollowedArtistsGridProps) {
  const followedArtists = await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      genres: artists.genres,
      followedAt: userFollowsArtists.createdAt,
      totalShows: artistStats.totalShows,
      followerCount: artistStats.followerCount,
      upcomingShows: sql<number>`count(distinct s.id)`,
    })
    .from(userFollowsArtists)
    .innerJoin(artists, eq(userFollowsArtists.artistId, artists.id))
    .leftJoin(artistStats, eq(artists.id, artistStats.artistId))
    .leftJoin(
      shows.as('s'),
      and(eq(artists.id, sql`s.artist_id`), gte(sql`s.date`, new Date()))
    )
    .where(eq(userFollowsArtists.userId, userId))
    .groupBy(
      artists.id,
      userFollowsArtists.createdAt,
      artistStats.totalShows,
      artistStats.followerCount
    )
    .orderBy(desc(userFollowsArtists.createdAt));

  if (followedArtists.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Music className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-semibold text-lg">
            No artists followed yet
          </h3>
          <p className="mb-4 text-muted-foreground">
            Start following your favorite artists to see their upcoming shows
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
      {followedArtists.map((artist) => (
        <Card key={artist.id} className="transition-shadow hover:shadow-lg">
          <Link href={`/artists/${artist.slug}`}>
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                  {artist.imageUrl ? (
                    <Image
                      src={artist.imageUrl}
                      alt={artist.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Music className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-lg">
                    {artist.name}
                  </h3>

                  {artist.genres && artist.genres.length > 0 && (
                    <div className="mt-1 mb-3 flex gap-1">
                      {artist.genres.slice(0, 2).map((genre) => (
                        <Badge
                          key={genre}
                          variant="secondary"
                          className="text-xs"
                        >
                          {genre}
                        </Badge>
                      ))}
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
