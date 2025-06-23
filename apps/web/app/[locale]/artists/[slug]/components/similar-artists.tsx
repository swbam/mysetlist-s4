import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { Music } from 'lucide-react';
import Link from 'next/link';
import { getSimilarArtists } from '../actions';

interface SimilarArtistsProps {
  artistId: string;
  genres: string | null;
}

export async function SimilarArtists({ artistId, genres }: SimilarArtistsProps) {
  const similarArtists = await getSimilarArtists(artistId, genres);

  if (similarArtists.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Similar Artists</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {similarArtists.map((artist) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.slug}`}
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
            >
              <Avatar>
                <AvatarImage src={artist.smallImageUrl || artist.imageUrl || undefined} />
                <AvatarFallback>
                  <Music className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{artist.name}</p>
                {artist.genres && (
                  <p className="truncate text-sm text-muted-foreground">
                    {JSON.parse(artist.genres).slice(0, 2).join(', ')}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}