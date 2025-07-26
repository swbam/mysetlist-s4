'use client';

import { MapPin } from 'lucide-react';
import { VenueCard } from './venue-card';

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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {venues.map((venue) => (
        <VenueCard key={venue.id} venue={venue} />
      ))}
    </div>
  );
}
