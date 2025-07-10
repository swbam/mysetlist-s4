'use client';

import { Card, CardContent } from '@repo/design-system';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system';
import { formatDistanceToNow } from 'date-fns';
import { Calendar, Disc3, Music } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FollowButton } from '~/app/artists/[slug]/components/follow-button';

interface FollowedArtist {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  followedAt: string;
  totalShows: number | null;
  totalSetlists: number | null;
  totalSongs: number | null;
  avgSongsPerShow: number | null;
}

export function FollowingList() {
  const [artists, setArtists] = useState<FollowedArtist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFollowedArtists();
  }, []);

  const fetchFollowedArtists = async () => {
    try {
      const response = await fetch('/api/user/following');
      if (response.ok) {
        const data = await response.json();
        setArtists(data.artists);
      }
    } catch (_error) {
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...new Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 rounded bg-muted" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (artists.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Music className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-semibold text-lg">
            No artists followed yet
          </h3>
          <p className="mb-4 text-muted-foreground">
            Start following your favorite artists to see them here
          </p>
          <Link href="/artists" className="text-primary hover:underline">
            Browse Artists
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {artists.map((artist) => (
        <Card key={artist.id} className="transition-shadow hover:shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Link href={`/artists/${artist.slug}`}>
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={artist.logoUrl || undefined}
                    alt={artist.name}
                  />
                  <AvatarFallback>
                    <Music className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/artists/${artist.slug}`}
                  className="block truncate font-semibold text-lg hover:underline"
                >
                  {artist.name}
                </Link>

                <p className="mb-3 text-muted-foreground text-sm">
                  Following since{' '}
                  {formatDistanceToNow(new Date(artist.followedAt), {
                    addSuffix: true,
                  })}
                </p>

                {/* Stats */}
                <div className="mb-4 flex flex-wrap gap-3 text-muted-foreground text-xs">
                  {artist.totalShows !== null && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {artist.totalShows} shows
                    </div>
                  )}
                  {artist.totalSetlists !== null && (
                    <div className="flex items-center gap-1">
                      <Disc3 className="h-3 w-3" />
                      {artist.totalSetlists} setlists
                    </div>
                  )}
                </div>

                <FollowButton artistId={artist.id} artistName={artist.name} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
