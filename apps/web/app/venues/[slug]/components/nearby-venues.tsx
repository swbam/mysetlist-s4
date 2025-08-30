"use client";

import { Badge } from "@repo/design-system";
import { Card } from "@repo/design-system";
import { MapPin, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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

export function NearbyVenues({
  venues,
  currentVenueId: _currentVenueId,
}: NearbyVenuesProps) {
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
      <h2 className="font-semibold text-2xl">Nearby Venues</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {venues.map((venue) => (
          <Link key={venue.id} href={`/venues/${venue.slug}`}>
            <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg">
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
                  <div className="flex h-full w-full items-center justify-center">
                    <MapPin className="h-12 w-12 text-muted-foreground/30" />
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
              <div className="space-y-2 p-4">
                <h3 className="line-clamp-1 font-semibold text-lg">
                  {venue.name}
                </h3>

                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {venue.city}, {venue.state || venue.country}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  {venue.capacity && (
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Users className="h-3 w-3" />
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
