'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { Car, Heart, MapPin, Star, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface VenueCardProps {
  venue: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state: string | null;
    country: string;
    capacity: number | null;
    venueType: string | null;
    imageUrl: string | null;
    avgRating?: number;
    reviewCount?: number;
    upcomingShowCount?: number;
    distance?: number;
    amenities: string | null;
  };
}

export function VenueCard({ venue }: VenueCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const formatCapacity = (capacity: number) => {
    if (capacity >= 1000) {
      return `${(capacity / 1000).toFixed(1)}k`;
    }
    return capacity.toString();
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return null;
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const venueTypeLabels: Record<string, string> = {
    arena: 'Arena',
    stadium: 'Stadium',
    theater: 'Theater',
    club: 'Club',
    'outdoor-amphitheater': 'Outdoor Amphitheater',
    'indoor-amphitheater': 'Indoor Amphitheater',
    ballroom: 'Ballroom',
    festival: 'Festival Grounds',
    other: 'Other',
  };

  const amenitiesList = venue.amenities ? JSON.parse(venue.amenities) : [];
  const hasParking = amenitiesList.includes('parking');

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <Link href={`/venues/${venue.slug}`}>
        <div className="relative aspect-square cursor-pointer overflow-hidden bg-muted">
          {venue.imageUrl ? (
            <Image
              src={venue.imageUrl}
              alt={venue.name}
              fill
              className="object-cover transition-transform hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <MapPin className="h-16 w-16 text-primary/30" />
            </div>
          )}
          {venue.distance !== undefined && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary">
                {formatDistance(venue.distance)} away
              </Badge>
            </div>
          )}
          {venue.avgRating && venue.avgRating >= 4.5 && (
            <div className="absolute top-2 right-2">
              <Badge variant="default" className="gap-1">
                <Star className="h-3 w-3 fill-current" />
                Top Rated
              </Badge>
            </div>
          )}
        </div>
      </Link>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Link href={`/venues/${venue.slug}`}>
            <h3 className="truncate font-semibold text-lg transition-colors hover:text-primary">
              {venue.name}
            </h3>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFavorite(!isFavorite)}
            className="h-8 w-8 flex-shrink-0"
          >
            <Heart
              className={`h-4 w-4 ${isFavorite ? 'fill-current text-red-500' : ''}`}
            />
          </Button>
        </div>

        <div className="mb-3 flex items-center gap-2 text-muted-foreground text-sm">
          <MapPin className="h-4 w-4" />
          <span className="truncate">
            {venue.city}, {venue.state || venue.country}
          </span>
        </div>

        <div className="mb-3 flex flex-wrap gap-1">
          {venue.venueType && (
            <Badge variant="outline" className="text-xs">
              {venueTypeLabels[venue.venueType] || venue.venueType}
            </Badge>
          )}
          {venue.capacity && (
            <Badge variant="secondary" className="text-xs">
              {formatCapacity(venue.capacity)} cap
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-muted-foreground text-sm">
          <div className="flex items-center gap-3">
            {hasParking && (
              <div className="flex items-center gap-1">
                <Car className="h-3 w-3" />
                <span>Parking</span>
              </div>
            )}
            {venue.avgRating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{venue.avgRating.toFixed(1)}</span>
              </div>
            )}
          </div>
          {venue.upcomingShowCount && venue.upcomingShowCount > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{venue.upcomingShowCount} shows</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}