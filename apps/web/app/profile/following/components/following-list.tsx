'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@repo/design-system';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system';
import { Music, Calendar, Disc3 } from 'lucide-react';
import { FollowButton } from '@/app/artists/[slug]/components/follow-button';
import { formatDistanceToNow } from 'date-fns';

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
    } catch (error) {
      console.error('Error fetching followed artists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
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
          <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No artists followed yet</h3>
          <p className="text-muted-foreground mb-4">
            Start following your favorite artists to see them here
          </p>
          <Link
            href="/artists"
            className="text-primary hover:underline"
          >
            Browse Artists
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {artists.map((artist) => (
        <Card key={artist.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Link href={`/artists/${artist.slug}`}>
                <Avatar className="h-16 w-16">
                  <AvatarImage src={artist.logoUrl || undefined} alt={artist.name} />
                  <AvatarFallback>
                    <Music className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
              </Link>
              
              <div className="flex-1 min-w-0">
                <Link
                  href={`/artists/${artist.slug}`}
                  className="font-semibold text-lg hover:underline block truncate"
                >
                  {artist.name}
                </Link>
                
                <p className="text-sm text-muted-foreground mb-3">
                  Following since {formatDistanceToNow(new Date(artist.followedAt), { addSuffix: true })}
                </p>
                
                {/* Stats */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
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