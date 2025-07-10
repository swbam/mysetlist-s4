'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
} from '@repo/design-system/components/ui/card';
import { Car, Heart, MapPin, Star, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface Venue {
  id: string;
  name: string;
  slug: string;
  address: string | null;
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
}

interface VenueGridClientProps {
  venues: Venue[];
}

export function VenueGridClient({ venues }: VenueGridClientProps) {
  const [favoriteVenues, setFavoriteVenues] = useState<string[]>([]);

  const toggleFavorite = (venueId: string) => {
    setFavoriteVenues((prev) =>
      prev.includes(venueId)
        ? prev.filter((id) => id !== venueId)
        : [...prev, venueId]
    );
  };

  const formatCapacity = (capacity: number) => {
    if (capacity >= 1000) {
      return `${(capacity / 1000).toFixed(1)}k`;
    }
    return capacity.toString();
  };

  const formatDistance = (distance?: number) => {
    if (!distance) {
      return null;
    }
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

  if (venues.length === 0) {
    return (
      <div className="py-12 text-center">
        <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="mb-2 font-semibold text-lg">No venues found</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters or search criteria
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {venues.map((venue) => {
        const amenitiesList = venue.amenities
          ? JSON.parse(venue.amenities)
          : [];
        const hasParking = amenitiesList.includes('parking');

        return (
          <Card
            key={venue.id}
            className="overflow-hidden transition-shadow hover:shadow-lg"
          >
            <div className="flex">
              {/* Venue Image */}
              {venue.imageUrl && (
                <div className="relative h-full w-48 flex-shrink-0">
                  <Image
                    src={venue.imageUrl}
                    alt={venue.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className="flex-1">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link href={`/venues/${venue.slug}`}>
                        <h3 className="font-semibold text-xl transition-colors hover:text-primary">
                          {venue.name}
                        </h3>
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {venue.venueType && (
                          <Badge variant="outline">
                            {venueTypeLabels[venue.venueType] ||
                              venue.venueType}
                          </Badge>
                        )}
                        {venue.capacity && (
                          <span className="text-muted-foreground text-sm">
                            Capacity: {formatCapacity(venue.capacity)}
                          </span>
                        )}
                        {venue.distance !== undefined && (
                          <Badge variant="secondary">
                            {formatDistance(venue.distance)} away
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFavorite(venue.id)}
                    >
                      <Heart
                        className={`h-4 w-4 ${favoriteVenues.includes(venue.id) ? 'fill-current text-red-500' : ''}`}
                      />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {venue.city}, {venue.state || venue.country}
                      </span>
                    </div>
                    {venue.avgRating !== undefined && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">
                          {venue.avgRating.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          ({venue.reviewCount || 0})
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 text-sm">
                    {hasParking && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Car className="h-4 w-4" />
                        <span>Parking</span>
                      </div>
                    )}
                    {venue.upcomingShowCount !== undefined &&
                      venue.upcomingShowCount > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{venue.upcomingShowCount} upcoming shows</span>
                        </div>
                      )}
                  </div>

                  <Link href={`/venues/${venue.slug}`}>
                    <Button variant="outline" className="w-full">
                      View Details & Shows
                    </Button>
                  </Link>
                </CardContent>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
