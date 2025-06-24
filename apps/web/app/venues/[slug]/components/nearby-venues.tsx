'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Users } from 'lucide-react';
import { Card } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';

interface NearbyVenue {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string;
  state: string | null;
  country: string;
  imageUrl: string | null;
  capacity: number | null;
  venueType: string | null;
  distance: number;
}

interface NearbyVenuesProps {
  venues: NearbyVenue[];
  currentVenueId: string;
}

export function NearbyVenues({ venues, currentVenueId }: NearbyVenuesProps) {
  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const formatCapacity = (capacity: number) => {
    if (capacity >= 1000) {
      return `${(capacity / 1000).toFixed(1)}k`;
    }
    return capacity.toString();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Nearby Venues</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {venues.map((venue) => (
          <Link key={venue.id} href={`/venues/${venue.slug}`}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
              {/* Venue Image */}
              <div className="relative h-48 bg-muted">
                {venue.imageUrl ? (
                  <Image
                    src={venue.imageUrl}
                    alt={venue.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
                {/* Distance Badge */}
                <Badge 
                  variant="secondary" 
                  className="absolute top-2 right-2 bg-background/90 backdrop-blur"
                >
                  {formatDistance(venue.distance)}
                </Badge>
              </div>

              {/* Venue Info */}
              <div className="p-4 space-y-2">
                <h3 className="font-semibold text-lg line-clamp-1">
                  {venue.name}
                </h3>
                
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{venue.city}, {venue.state || venue.country}</span>
                </div>

                <div className="flex items-center justify-between">
                  {venue.capacity && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{formatCapacity(venue.capacity)}</span>
                    </div>
                  )}
                  
                  {venue.venueType && (
                    <Badge variant="outline" className="text-xs">
                      {venue.venueType}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}