import { db } from '@repo/database';
import { artistStats, artists } from '@repo/database/src/schema';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { desc, eq } from 'drizzle-orm';
import { Music, TrendingUp, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

async function getTrendingArtists() {
  const trendingArtists = await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      smallImageUrl: artists.smallImageUrl,
      genres: artists.genres,
      followers: artists.followers,
      trendingScore: artists.trendingScore,
      totalShows: artistStats.totalShows,
    })
    .from(artists)
    .leftJoin(artistStats, eq(artistStats.artistId, artists.id))
    .orderBy(desc(artists.trendingScore))
    .limit(4);

  return trendingArtists;
}

export async function TrendingArtists() {
  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
  };

  const trendingArtists = await getTrendingArtists();

  if (trendingArtists.length === 0) {
    return null; // Don't show the section if no trending artists
  }

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="mb-2 font-bold text-3xl tracking-tight md:text-4xl">
              Trending Artists
            </h2>
            <p className="text-muted-foreground">
              Discover who's hot right now in the live music scene
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/artists">View All Artists</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {trendingArtists.map((artist) => (
            <Card
              key={artist.id}
              className="overflow-hidden transition-shadow hover:shadow-lg"
            >
              <Link href={`/artists/${artist.slug}`}>
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {artist.smallImageUrl || artist.imageUrl ? (
                    <Image
                      src={artist.smallImageUrl || artist.imageUrl || ''}
                      alt={artist.name}
                      fill
                      className="object-cover transition-transform hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <Music className="h-16 w-16 text-primary/30" />
                    </div>
                  )}
                  {artist.trendingScore && artist.trendingScore > 85 && (
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-background/90 backdrop-blur"
                      >
                        <TrendingUp className="h-3 w-3" />
                        Hot
                      </Badge>
                    </div>
                  )}
                </div>
              </Link>
              <CardContent className="p-4">
                <Link href={`/artists/${artist.slug}`}>
                  <h3 className="mb-2 font-semibold text-lg transition-colors hover:text-primary">
                    {artist.name}
                  </h3>
                </Link>

                {artist.genres && (
                  <div className="mb-3 flex gap-2">
                    {(() => {
                      try {
                        const genres = JSON.parse(artist.genres);
                        return genres.slice(0, 2).map((genre: string) => (
                          <Badge
                            key={genre}
                            variant="outline"
                            className="text-xs"
                          >
                            {genre}
                          </Badge>
                        ));
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                )}

                <div className="flex items-center justify-between text-muted-foreground text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {formatFollowers(artist.followers || 0)}
                  </span>
                  {artist.totalShows && <span>{artist.totalShows} shows</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
