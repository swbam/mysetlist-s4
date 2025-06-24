'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';
import { TrendingUp, Users, Calendar, MapPin, ExternalLink, Clock } from 'lucide-react';

interface TrendingShow {
  id: string;
  name: string;
  slug: string;
  date: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  artist: {
    name: string;
    slug: string;
    imageUrl?: string;
  };
  venue: {
    name: string;
    city: string;
    state?: string;
  };
  voteCount: number;
  attendeeCount: number;
  trendingScore: number;
  weeklyGrowth: number;
}

export function TrendingShows() {
  const [shows, setShows] = useState<TrendingShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendingShows();
  }, []);

  const fetchTrendingShows = async () => {
    try {
      const response = await fetch('/api/trending/shows');
      if (!response.ok) throw new Error('Failed to fetch trending shows');
      
      const data = await response.json();
      setShows(data.shows || []);
    } catch (err) {
      console.error('Error fetching trending shows:', err);
      setError('Failed to load trending shows');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming': return { variant: 'default' as const, text: 'Upcoming', color: 'text-blue-500' };
      case 'ongoing': return { variant: 'default' as const, text: 'Live', color: 'text-red-500' };
      case 'completed': return { variant: 'secondary' as const, text: 'Completed', color: 'text-gray-500' };
      default: return { variant: 'outline' as const, text: status, color: 'text-gray-500' };
    }
  };

  const getGrowthBadge = (growth: number) => {
    if (growth > 20) return { variant: 'default' as const, text: 'Hot', color: 'text-red-500' };
    if (growth > 10) return { variant: 'secondary' as const, text: 'Rising', color: 'text-orange-500' };
    if (growth > 0) return { variant: 'outline' as const, text: 'Growing', color: 'text-green-500' };
    return { variant: 'outline' as const, text: 'Stable', color: 'text-gray-500' };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
            <div className="text-lg font-bold text-muted-foreground w-8">
              {i + 1}
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <div className="text-right space-y-1">
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
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchTrendingShows} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (shows.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No trending shows found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {shows.map((show, index) => {
        const statusBadge = getStatusBadge(show.status);
        const growthBadge = getGrowthBadge(show.weeklyGrowth);
        
        return (
          <div
            key={show.id}
            className="flex items-center gap-4 p-4 rounded-lg border hover:shadow-md transition-shadow"
          >
            {/* Rank */}
            <div className="text-xl font-bold text-muted-foreground w-8">
              {index + 1}
            </div>

            {/* Artist Avatar */}
            <Avatar className="h-12 w-12">
              <AvatarImage src={show.artist.imageUrl} alt={show.artist.name} />
              <AvatarFallback>
                <Calendar className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>

            {/* Show Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/shows/${show.slug}`}
                  className="font-semibold hover:underline truncate"
                >
                  {show.artist.name}
                </Link>
                <Badge variant={statusBadge.variant} className="text-xs">
                  {statusBadge.text}
                </Badge>
                <Badge variant={growthBadge.variant} className="text-xs">
                  {growthBadge.text}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-1">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {show.venue.name}, {show.venue.city}
                  {show.venue.state && `, ${show.venue.state}`}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(show.date)}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {show.voteCount} votes
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {show.attendeeCount} attending
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm font-medium">
                <TrendingUp className={`h-3 w-3 ${growthBadge.color}`} />
                {show.weeklyGrowth > 0 ? '+' : ''}{show.weeklyGrowth.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">
                Score: {show.trendingScore.toFixed(0)}
              </div>
            </div>

            {/* External Link */}
            <Link href={`/shows/${show.slug}`}>
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