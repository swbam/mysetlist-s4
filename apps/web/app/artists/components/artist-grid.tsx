'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { Calendar, Heart, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useState, memo, useCallback } from 'react';

// Mock data - in real app this would come from the database
const mockArtists = [
  {
    id: 1,
    name: 'Taylor Swift',
    genre: 'Pop',
    image: '/api/placeholder/400/400',
    followers: 850000,
    upcomingShows: 12,
    trending: 98,
  },
  {
    id: 2,
    name: 'The Weeknd',
    genre: 'R&B',
    image: '/api/placeholder/400/400',
    followers: 720000,
    upcomingShows: 8,
    trending: 92,
  },
  {
    id: 3,
    name: 'Olivia Rodrigo',
    genre: 'Pop Rock',
    image: '/api/placeholder/400/400',
    followers: 650000,
    upcomingShows: 15,
    trending: 89,
  },
  {
    id: 4,
    name: 'Arctic Monkeys',
    genre: 'Indie Rock',
    image: '/api/placeholder/400/400',
    followers: 580000,
    upcomingShows: 10,
    trending: 87,
  },
  {
    id: 5,
    name: 'Billie Eilish',
    genre: 'Alternative',
    image: '/api/placeholder/400/400',
    followers: 920000,
    upcomingShows: 18,
    trending: 85,
  },
  {
    id: 6,
    name: 'Post Malone',
    genre: 'Hip Hop',
    image: '/api/placeholder/400/400',
    followers: 680000,
    upcomingShows: 7,
    trending: 82,
  },
  {
    id: 7,
    name: 'Dua Lipa',
    genre: 'Pop',
    image: '/api/placeholder/400/400',
    followers: 540000,
    upcomingShows: 14,
    trending: 79,
  },
  {
    id: 8,
    name: 'The 1975',
    genre: 'Indie Pop',
    image: '/api/placeholder/400/400',
    followers: 420000,
    upcomingShows: 9,
    trending: 76,
  },
  {
    id: 9,
    name: 'Bad Bunny',
    genre: 'Reggaeton',
    image: '/api/placeholder/400/400',
    followers: 880000,
    upcomingShows: 20,
    trending: 95,
  },
  {
    id: 10,
    name: 'Radiohead',
    genre: 'Alternative Rock',
    image: '/api/placeholder/400/400',
    followers: 620000,
    upcomingShows: 5,
    trending: 72,
  },
  {
    id: 11,
    name: 'Kendrick Lamar',
    genre: 'Hip Hop',
    image: '/api/placeholder/400/400',
    followers: 750000,
    upcomingShows: 11,
    trending: 88,
  },
  {
    id: 12,
    name: 'Lana Del Rey',
    genre: 'Indie Pop',
    image: '/api/placeholder/400/400',
    followers: 590000,
    upcomingShows: 13,
    trending: 81,
  },
];

const ArtistGridComponent = () => {
  const [followedArtists, setFollowedArtists] = useState<number[]>([]);

  const toggleFollow = useCallback((artistId: number) => {
    setFollowedArtists((prev) =>
      prev.includes(artistId)
        ? prev.filter((id) => id !== artistId)
        : [...prev, artistId]
    );
  }, []);

  const formatFollowers = useCallback((count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {mockArtists.map((artist) => (
        <Card
          key={artist.id}
          className="overflow-hidden transition-shadow hover:shadow-lg"
        >
          <Link href={`/artists/${artist.id}`}>
            <div className="relative aspect-square cursor-pointer bg-gradient-to-br from-primary/20 to-primary/5">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="font-bold text-6xl text-primary/20">
                  {artist.name
                    .split(' ')
                    .map((word) => word[0])
                    .join('')}
                </div>
              </div>
              {artist.trending > 85 && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Hot
                  </Badge>
                </div>
              )}
            </div>
          </Link>
          <CardContent className="p-4">
            <Link href={`/artists/${artist.id}`}>
              <h3 className="mb-1 font-semibold text-lg transition-colors hover:text-primary">
                {artist.name}
              </h3>
            </Link>
            <Badge variant="outline" className="mb-3">
              {artist.genre}
            </Badge>

            <div className="mb-4 flex items-center justify-between text-muted-foreground text-sm">
              <span>{formatFollowers(artist.followers)} followers</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{artist.upcomingShows} shows</span>
              </div>
            </div>

            <Button
              variant={
                followedArtists.includes(artist.id) ? 'default' : 'outline'
              }
              size="sm"
              className="w-full gap-2"
              onClick={() => toggleFollow(artist.id)}
            >
              <Heart
                className={`h-4 w-4 ${followedArtists.includes(artist.id) ? 'fill-current' : ''}`}
              />
              {followedArtists.includes(artist.id) ? 'Following' : 'Follow'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Memoized export for performance
export const ArtistGrid = memo(ArtistGridComponent);
