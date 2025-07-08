'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/design-system/components/ui/avatar';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';
import { ExternalLink, Music, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface TrendingArtist {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  followers: number;
  popularity: number;
  trendingScore: number;
  genres: string[];
  recentShows: number;
  weeklyGrowth: number;
}

export function TrendingArtists() {
  const [artists, setArtists] = useState<TrendingArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendingArtists();
  }, []);

  const fetchTrendingArtists = async () => {
    try {
      const response = await fetch('/api/trending/artists');
      if (!response.ok) throw new Error('Failed to fetch trending artists');

      const data = await response.json();
      setArtists(data.artists || []);
    } catch (err) {
      console.error('Error fetching trending artists:', err);
      setError('Failed to load trending artists');
    } finally {
      setLoading(false);
    }
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getGrowthBadge = (growth: number) => {
    if (growth > 20)
      return {
        variant: 'default' as const,
        text: 'Hot',
        color: 'text-red-500',
      };
    if (growth > 10)
      return {
        variant: 'secondary' as const,
        text: 'Rising',
        color: 'text-orange-500',
      };
    if (growth > 0)
      return {
        variant: 'outline' as const,
        text: 'Growing',
        color: 'text-green-500',
      };
    return {
      variant: 'outline' as const,
      text: 'Stable',
      color: 'text-gray-500',
    };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border p-4"
          >
            <div className="w-8 font-bold text-lg text-muted-foreground">
              {i + 1}
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="space-y-1 text-right">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="mb-4 text-muted-foreground">{error}</p>
        <Button onClick={fetchTrendingArtists} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (artists.length === 0) {
    return (
      <div className="py-8 text-center">
        <Music className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No trending artists found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {artists.map((artist, index) => {
        const growthBadge = getGrowthBadge(artist.weeklyGrowth);

        return (
          <div
            key={artist.id}
            className="flex items-center gap-4 rounded-lg border p-4 transition-shadow hover:shadow-md"
          >
            {/* Rank */}
            <div className="w-8 font-bold text-muted-foreground text-xl">
              {index + 1}
            </div>

            {/* Artist Avatar */}
            <Avatar className="h-12 w-12">
              <AvatarImage src={artist.imageUrl} alt={artist.name} />
              <AvatarFallback>
                <Music className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>

            {/* Artist Info */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Link
                  href={`/artists/${artist.slug}`}
                  className="truncate font-semibold hover:underline"
                >
                  {artist.name}
                </Link>
                <Badge variant={growthBadge.variant} className="text-xs">
                  {growthBadge.text}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-muted-foreground text-sm">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {formatFollowers(artist.followers)} followers
                </span>
                <span className="flex items-center gap-1">
                  <Music className="h-3 w-3" />
                  {artist.recentShows} recent shows
                </span>
              </div>

              {/* Genres */}
              <div className="mt-2 flex flex-wrap gap-1">
                {artist.genres.slice(0, 3).map((genre) => (
                  <Badge key={genre} variant="outline" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="text-right">
              <div className="flex items-center gap-1 font-medium text-sm">
                <TrendingUp className={`h-3 w-3 ${growthBadge.color}`} />
                {artist.weeklyGrowth > 0 ? '+' : ''}
                {artist.weeklyGrowth.toFixed(1)}%
              </div>
              <div className="text-muted-foreground text-xs">
                Score: {artist.trendingScore.toFixed(0)}
              </div>
            </div>

            {/* External Link */}
            <Link href={`/artists/${artist.slug}`}>
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
