'use client';

import { useState } from 'react';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { Heart, Music, Users, Calendar, MapPin, ExternalLink, Verified } from 'lucide-react';
import { useAuth } from '../../../providers/auth-provider';
import Link from 'next/link';

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
    followerCount: number;
    _count?: {
      shows: number;
      setlists: number;
    };
  };
  isFollowing?: boolean;
  onFollow?: () => void;
}

export function ArtistHeader({ artist, isFollowing = false, onFollow }: ArtistHeaderProps) {
  const { user } = useAuth();
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const genres = artist.genres ? JSON.parse(artist.genres) : [];
  const externalUrls = artist.externalUrls ? JSON.parse(artist.externalUrls) : {};

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleFollow = async () => {
    if (!user || !onFollow) return;
    
    setIsFollowLoading(true);
    try {
      await onFollow();
    } catch (error) {
      console.error('Failed to follow/unfollow artist:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Hero Banner */}
      <div className="relative h-64 lg:h-80 bg-gradient-to-br from-primary/20 via-background to-secondary/20 overflow-hidden">
        {artist.imageUrl && (
          <div className="absolute inset-0 bg-black/20">
            <img
              src={artist.imageUrl}
              alt={artist.name}
              className="w-full h-full object-cover opacity-30 blur-sm"
            />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        
        <div className="container mx-auto px-4 h-full flex items-end pb-8">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-end w-full">
            {/* Artist Avatar */}
            <Avatar className="h-32 w-32 lg:h-40 lg:w-40 border-4 border-background shadow-2xl">
              <AvatarImage src={artist.imageUrl} alt={artist.name} />
              <AvatarFallback className="text-2xl lg:text-3xl">
                <Music className="h-12 w-12 lg:h-16 lg:w-16" />
              </AvatarFallback>
            </Avatar>

            {/* Artist Info */}
            <div className="flex-1">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl lg:text-5xl font-bold text-foreground">
                      {artist.name}
                    </h1>
                    {artist.verified && (
                      <Verified className="h-6 w-6 lg:h-8 lg:w-8 text-blue-500 fill-current" />
                    )}
                  </div>
                  
                  {/* Genres */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {genres.slice(0, 4).map((genre: string) => (
                      <Badge key={genre} variant="secondary" className="capitalize">
                        {genre}
                      </Badge>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {formatFollowers(artist.followers)} followers
                    </div>
                    {artist.monthlyListeners && (
                      <div className="flex items-center gap-1">
                        <Music className="h-4 w-4" />
                        {formatFollowers(artist.monthlyListeners)} monthly listeners
                      </div>
                    )}
                    {artist._count?.shows && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {artist._count.shows} shows
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      {formatFollowers(artist.followerCount)} fans
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {user && (
                    <Button
                      onClick={handleFollow}
                      disabled={isFollowLoading}
                      variant={isFollowing ? 'default' : 'outline'}
                      size="lg"
                    >
                      <Heart className={`h-4 w-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                  )}
                  
                  {externalUrls.spotify && (
                    <Button variant="outline" size="lg" asChild>
                      <Link href={externalUrls.spotify} target="_blank">
                        <ExternalLink className="h-4 w-4 mr-2" />
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
            <h3 className="font-semibold mb-3">About</h3>
            <p className="text-muted-foreground leading-relaxed">{artist.bio}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}