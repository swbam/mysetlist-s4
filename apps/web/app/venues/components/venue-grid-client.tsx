'use client';

import { VenueCard } from '~/components/cards/venue-card';
import { ResponsiveGrid, EmptyState } from '~/components/layout/responsive-grid';
import { MapPin } from 'lucide-react';
import { MapPin } from 'lucide-react';
import { VenueCard } from './venue-card';

interface Venue {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
  country: string;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  avgRating?: number;
  reviewCount?: number;
  upcomingShowCount?: number;
  distance?: number;
  amenities: string | null;
  website?: string | null;

}

interface VenueGridClientProps {
  venues: Venue[];
}

export function VenueGridClient({ venues }: VenueGridClientProps) {
  const handleFavorite = (venueId: string) => {
    // TODO: Implement favorite functionality
    console.log('Favoriting venue:', venueId);
  };

  const emptyState = (
    <EmptyState
      icon={<MapPin className="h-8 w-8 text-muted-foreground" />}
      title="No Venues Found"
      description="Try adjusting your filters or search criteria to find venues in your area."
    />
  );

  return (
    <ResponsiveGrid 
      variant="venues" 
      emptyState={emptyState}
      className="min-h-[600px]"
    >
      {venues.map((venue) => (
        <div key={venue.id} role="gridcell">
          <VenueCard 
            venue={venue}
            variant="default"
            showFavoriteButton={true}
            onFavorite={handleFavorite}
          />
        </div>
      ))}
    </ResponsiveGrid>
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