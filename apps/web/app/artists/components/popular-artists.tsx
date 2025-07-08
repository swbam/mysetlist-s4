import { db } from '@repo/database';
import { artists, showArtists, shows } from '@repo/database/src/schema';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { desc, eq, sql } from 'drizzle-orm';
import { Calendar, Star, Users } from 'lucide-react';
import Link from 'next/link';

async function getPopularArtists() {
  // Get artists ordered by their overall popularity (follower count, show attendance, etc.)
  const popularArtists = await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      genres: artists.genres,
      verified: artists.verified,
      followerCount: artists.followerCount,
      upcomingShows: sql<number>`
        COUNT(DISTINCT CASE 
          WHEN ${shows.date} >= CURRENT_DATE 
          AND ${shows.status} = 'upcoming' 
          THEN ${shows.id} 
        END)
      `.as('upcomingShows'),
      avgAttendance: sql<number>`
        COALESCE(AVG(${shows.attendeeCount}), 0)
      `.as('avgAttendance'),
    })
    .from(artists)
    .leftJoin(showArtists, eq(artists.id, showArtists.artistId))
    .leftJoin(shows, eq(showArtists.showId, shows.id))
    .where(
      sql`${artists.followerCount} > 0 
      OR EXISTS (
        SELECT 1 FROM ${shows} 
        JOIN ${showArtists} ON ${shows.id} = ${showArtists.showId}
        WHERE ${showArtists.artistId} = ${artists.id}
      )`
    )
    .groupBy(artists.id)
    .orderBy(desc(artists.followerCount))
    .limit(8);

  return popularArtists;
}

export async function PopularArtists() {
  const artists = await getPopularArtists();

  if (artists.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">No artists found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {artists.map((artist) => (
        <Link
          key={artist.id}
          href={`/artists/${artist.slug}`}
          className="block transition-transform hover:scale-[1.02]"
        >
          <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg">
            <div className="relative aspect-square overflow-hidden bg-muted">
              {artist.imageUrl ? (
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="text-6xl text-muted-foreground">
                    {artist.name.slice(0, 2).toUpperCase()}
                  </div>
                </div>
              )}
              {artist.verified && (
                <div className="absolute top-2 right-2">
                  <div className="rounded-full bg-primary p-1 text-primary-foreground">
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <h3 className="mb-2 truncate font-semibold text-lg">
                {artist.name}
              </h3>
              {artist.genres && artist.genres.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {artist.genres.slice(0, 2).map((genre) => (
                    <Badge key={genre} variant="secondary" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>
                    {artist.followerCount > 1000
                      ? `${(artist.followerCount / 1000).toFixed(0)}k`
                      : artist.followerCount}{' '}
                    fans
                  </span>
                </div>
                {artist.upcomingShows > 0 && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{artist.upcomingShows} shows</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
