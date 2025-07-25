import { Button } from '@repo/design-system';
import { Badge } from '@repo/design-system';
import { Card, CardContent } from '@repo/design-system';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system';
import { Calendar, ExternalLink, Music, Users, Verified } from 'lucide-react';
import Link from 'next/link';
import React, { Suspense } from 'react';
import { parseGenres } from '~/lib/utils';
import { FollowButton } from './follow-button';
import { FollowerCount } from './follower-count';

interface ArtistHeaderProps {
  artist: {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    smallImageUrl?: string;
    genres: string;
    popularity: number;
    followers: number;
    monthlyListeners?: number;
    verified: boolean;
    bio?: string;
    externalUrls?: string;
    _count?: {
      shows: number;
      setlists: number;
    };
  };
}

export const ArtistHeader = React.memo(function ArtistHeader({ artist }: ArtistHeaderProps) {
  // Safe genre parsing with utility function
  const genres = React.useMemo(() => {
    return parseGenres(artist.genres);
  }, [artist.genres]);

  const externalUrls = React.useMemo(() => {
    try {
      return artist.externalUrls ? JSON.parse(artist.externalUrls) : {};
    } catch (error) {
      console.warn('Failed to parse external URLs:', error);
      return {};
    }
  }, [artist.externalUrls]);

  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="w-full">
      {/* Hero Banner */}
      <div className="relative h-64 overflow-hidden bg-gradient-to-br from-primary/20 via-background to-secondary/20 lg:h-80">
        {artist.imageUrl && (
          <div className="absolute inset-0 bg-black/20">
            <img
              src={artist.imageUrl}
              alt={artist.name}
              className="h-full w-full object-cover opacity-30 blur-sm"
            />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />

        <div className="container mx-auto flex h-full items-end px-4 pb-8">
          <div className="flex w-full flex-col items-start gap-6 lg:flex-row lg:items-end">
            {/* Artist Avatar */}
            <Avatar className="h-32 w-32 border-4 border-background shadow-2xl lg:h-40 lg:w-40">
              <AvatarImage src={artist.imageUrl} alt={artist.name} />
              <AvatarFallback className="text-2xl lg:text-3xl">
                <Music className="h-12 w-12 lg:h-16 lg:w-16" />
              </AvatarFallback>
            </Avatar>

            {/* Artist Info */}
            <div className="flex-1">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <h1 className="font-bold text-3xl text-foreground lg:text-5xl">
                      {artist.name}
                    </h1>
                    {artist.verified && (
                      <Verified className="h-6 w-6 fill-current text-blue-500 lg:h-8 lg:w-8" />
                    )}
                  </div>

                  {/* Genres */}
                  <div className="mb-3 flex flex-wrap gap-2">
                    {genres.slice(0, 4).map((genre: string) => (
                      <Badge
                        key={genre}
                        variant="secondary"
                        className="capitalize"
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-6 text-muted-foreground text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <Suspense fallback={<span>Loading...</span>}>
                        <FollowerCount />
                      </Suspense>
                    </div>
                    {artist.monthlyListeners && (
                      <div className="flex items-center gap-1">
                        <Music className="h-4 w-4" />
                        {formatFollowers(artist.monthlyListeners)} monthly
                        listeners
                      </div>
                    )}
                    {artist._count?.shows && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {artist._count.shows} shows
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <FollowButton />
                  {externalUrls.spotify && (
                    <Button variant="outline" size="lg" asChild>
                      <Link href={externalUrls.spotify} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Spotify
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bio */}
      {artist.bio && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="mb-3 font-semibold">About</h3>
            <p className="text-muted-foreground leading-relaxed">
              {artist.bio}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
});