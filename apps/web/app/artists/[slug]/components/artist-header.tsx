'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Card } from '@repo/design-system/components/ui/card';
import { CheckCircle2, Music, Users, Calendar } from 'lucide-react';
import { followArtist, unfollowArtist, checkIfFollowing } from '../actions';
import { useToast } from '@repo/design-system/hooks/use-toast';
import { formatNumber } from '@/lib/utils';
import { useEffect } from 'react';
import { FollowerCount } from './follower-count';
import { useTracking } from '@/lib/analytics/tracking';

interface ArtistHeaderProps {
  artist: {
    id: string;
    name: string;
    imageUrl: string | null;
    genres: string | null;
    followers: number | null;
    followerCount: number | null;
    monthlyListeners: number | null;
    verified: boolean;
    popularity: number | null;
  };
}

export function ArtistHeader({ artist }: ArtistHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { track } = useTracking();

  useEffect(() => {
    checkIfFollowing(artist.id).then(setIsFollowing);
  }, [artist.id]);

  const handleFollowToggle = () => {
    startTransition(async () => {
      try {
        if (isFollowing) {
          await unfollowArtist(artist.id);
          setIsFollowing(false);
          
          // Track unfollow event
          track('artist_unfollow', {
            artistId: artist.id,
            artistName: artist.name,
            category: 'engagement',
          });
          
          toast({
            title: 'Unfollowed',
            description: `You are no longer following ${artist.name}`,
          });
        } else {
          const result = await followArtist(artist.id);
          if (result.success) {
            setIsFollowing(true);
            
            // Track follow event
            track('artist_follow', {
              artistId: artist.id,
              artistName: artist.name,
              category: 'engagement',
            });
            
            toast({
              title: 'Following',
              description: `You are now following ${artist.name}`,
            });
          } else if (result.error) {
            toast({
              title: 'Error',
              description: result.error,
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Please sign in to follow artists',
          variant: 'destructive',
        });
      }
    });
  };

  const genres = artist.genres ? JSON.parse(artist.genres) : [];

  return (
    <div className="relative">
      {/* Background gradient */}
      <div className="absolute inset-0 h-96 bg-gradient-to-b from-primary/10 to-background" />
      
      <div className="container relative mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-end">
          {/* Artist image */}
          <div className="relative h-48 w-48 overflow-hidden rounded-full shadow-2xl md:h-64 md:w-64">
            {artist.imageUrl ? (
              <Image
                src={artist.imageUrl}
                alt={artist.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <Music className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Artist info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                {artist.name}
              </h1>
              {artist.verified && (
                <CheckCircle2 className="h-8 w-8 text-primary" />
              )}
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-2 md:justify-start">
                {genres.slice(0, 4).map((genre: string) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground md:justify-start">
              {artist.monthlyListeners && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{formatNumber(artist.monthlyListeners)} monthly listeners</span>
                </div>
              )}
              {artist.followerCount !== null && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <FollowerCount 
                    initialCount={artist.followerCount} 
                    artistId={artist.id} 
                  />
                </div>
              )}
            </div>

            {/* Follow button */}
            <div className="mt-6">
              <Button
                onClick={handleFollowToggle}
                disabled={isPending}
                size="lg"
                variant={isFollowing ? 'outline' : 'default'}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}