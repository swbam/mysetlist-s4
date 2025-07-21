import { Badge } from '@repo/design-system/components/ui/badge';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { Calendar, Star, Users } from 'lucide-react';
import Link from 'next/link';
import { parseGenres } from '~/lib/parse-genres';
import { createClient } from '~/lib/supabase/server';

async function getPopularArtists() {
  const supabase = await createClient();
  
  // Get artists ordered by their overall popularity
  const { data: popularArtists, error } = await supabase
    .from('artists')
    .select('*')
    .eq('verified', true)
    .order('follower_count', { ascending: false })
    .limit(8);

  if (error) {
    console.error('Error fetching popular artists:', error);
    return [];
  }

  // Process the data to match the expected format
  const processedArtists = popularArtists?.map(artist => ({
    id: artist.id,
    name: artist.name,
    slug: artist.slug,
    imageUrl: artist.image_url,
    genres: artist.genres,
    verified: artist.verified,
    followerCount: artist.follower_count || 0,
    upcomingShows: 0, // Simplified for now
    avgAttendance: 0  // Simplified for now
  })) || [];

  return processedArtists;
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
      {artists.map((artistRaw) => {
        const genres = parseGenres(artistRaw.genres);
        const artist = { ...artistRaw, genres } as typeof artistRaw & {
          genres: string[];
        };

        return (
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
                {genres.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {genres.slice(0, 2).map((genre) => (
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
                <div className="flex items-center justify-between text-muted-foreground text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>
                      {artist.followerCount && artist.followerCount > 1000
                        ? `${(artist.followerCount / 1000).toFixed(0)}k`
                        : artist.followerCount || 0}{' '}
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
        );
      })}
    </div>
  );
}
