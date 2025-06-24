'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';
import { TrendingUp, Users, Calendar, MapPin, ExternalLink, Building } from 'lucide-react';

interface TrendingVenue {
  id: string;
  name: string;
  slug: string;
  city: string;
  state?: string;
  country: string;
  capacity?: number;
  upcomingShows: number;
  totalShows: number;
  trendingScore: number;
  weeklyGrowth: number;
  imageUrl?: string;
}

export function TrendingVenues() {
  const [venues, setVenues] = useState<TrendingVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendingVenues();
  }, []);

  const fetchTrendingVenues = async () => {
    try {
      const response = await fetch('/api/trending/venues');
      if (!response.ok) throw new Error('Failed to fetch trending venues');
      
      const data = await response.json();
      setVenues(data.venues || []);
    } catch (err) {
      console.error('Error fetching trending venues:', err);
      setError('Failed to load trending venues');
    } finally {
      setLoading(false);
    }
  };

  const formatCapacity = (capacity?: number) => {
    if (!capacity) return 'N/A';
    if (capacity >= 1000) return `${(capacity / 1000).toFixed(1)}K`;
    return capacity.toString();
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
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
              <Building className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
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
        <Button onClick={fetchTrendingVenues} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="text-center py-8">
        <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No trending venues found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {venues.map((venue, index) => {
        const growthBadge = getGrowthBadge(venue.weeklyGrowth);
        
        return (
          <div
            key={venue.id}
            className="flex items-center gap-4 p-4 rounded-lg border hover:shadow-md transition-shadow"
          >
            {/* Rank */}
            <div className="text-xl font-bold text-muted-foreground w-8">
              {index + 1}
            </div>

            {/* Venue Icon/Image */}
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              {venue.imageUrl ? (
                <img
                  src={venue.imageUrl}
                  alt={venue.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <Building className="h-6 w-6 text-muted-foreground" />
              )}
            </div>

            {/* Venue Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/venues/${venue.slug}`}
                  className="font-semibold hover:underline truncate"
                >
                  {venue.name}
                </Link>
                <Badge variant={growthBadge.variant} className="text-xs">
                  {growthBadge.text}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-1">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {venue.city}
                  {venue.state && `, ${venue.state}`}
                  {venue.country && `, ${venue.country}`}
                </span>
                {venue.capacity && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {formatCapacity(venue.capacity)} capacity
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {venue.upcomingShows} upcoming shows
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {venue.totalShows} total shows
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm font-medium">
                <TrendingUp className={`h-3 w-3 ${growthBadge.color}`} />
                {venue.weeklyGrowth > 0 ? '+' : ''}{venue.weeklyGrowth.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">
                Score: {venue.trendingScore.toFixed(0)}
              </div>
            </div>

            {/* External Link */}
            <Link href={`/venues/${venue.slug}`}>
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