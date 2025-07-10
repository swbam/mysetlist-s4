import { db } from '@repo/database';
import { artists, showArtists, shows } from '@repo/database/src/schema';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/design-system/components/ui/avatar';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Card } from '@repo/design-system/components/ui/card';
import { desc, eq, sql } from 'drizzle-orm';
import { Calendar, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { parseGenres } from '~/lib/parse-genres';

async function getTrendingArtists() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get artists with recent activity and high engagement
  const trendingArtists = await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      genres: artists.genres,
      verified: artists.verified,
      trendingScore: artists.trendingScore,
      upcomingShows: sql<number>`
        COUNT(DISTINCT CASE 
          WHEN ${shows.date} >= CURRENT_DATE 
          AND ${shows.status} = 'upcoming' 
          THEN ${shows.id} 
        END)
      `.as('upcomingShows'),
      totalAttendees: sql<number>`
        COALESCE(SUM(${shows.attendeeCount}), 0)
      `.as('totalAttendees'),
    })
    .from(artists)
    .leftJoin(showArtists, eq(artists.id, showArtists.artistId))
    .leftJoin(shows, eq(showArtists.showId, shows.id))
    .where(
      sql`${artists.trendingScore} > 0 
      AND EXISTS (
        SELECT 1 FROM ${shows} 
        JOIN ${showArtists} ON ${shows.id} = ${showArtists.showId}
        WHERE ${showArtists.artistId} = ${artists.id}
        AND ${shows.date} >= CURRENT_DATE
      )`
    )
    .groupBy(artists.id)
    .orderBy(desc(artists.trendingScore))
    .limit(5);

  return trendingArtists;
}

export async function TrendingArtists() {
  const artists = await getTrendingArtists();

  if (artists.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          No trending artists at the moment
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {artists.map((artistRaw, index) => {
        const genres = parseGenres(artistRaw.genres);
        const artist = { ...artistRaw, genres } as typeof artistRaw & {
          genres: string[];
        };
        return (
          <Link
            key={artist.id}
            href={`/artists/${artist.slug}`}
            className="block transition-transform hover:scale-[1.01]"
          >
            <Card className="p-4 transition-shadow hover:shadow-lg">
              <div className="flex items-center gap-4">
                <div className="flex w-8 items-center gap-1 font-bold text-muted-foreground text-xl">
                  #{index + 1}
                </div>
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={artist.imageUrl || undefined}
                    alt={artist.name}
                  />
                  <AvatarFallback>
                    {artist.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-lg">
                      {artist.name}
                    </h3>
                    {artist.verified && (
                      <Badge variant="secondary" className="shrink-0">
                        Verified
                      </Badge>
                    )}
                  </div>
                  {genres.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {genres.slice(0, 2).map((genre: string) => (
                        <Badge
                          key={genre}
                          variant="outline"
                          className="text-xs"
                        >
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-muted-foreground text-sm">
                  {(artist.upcomingShows ?? 0) > 0 && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{artist.upcomingShows} shows</span>
                    </div>
                  )}
                  {(artist.totalAttendees ?? 0) > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>
                        {((artist.totalAttendees ?? 0) / 1000).toFixed(1)}k
                        interested
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-primary">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-semibold">
                      +{Math.round(artist.trendingScore)}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
