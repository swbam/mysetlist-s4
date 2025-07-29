"use client";

import { MapPin } from "lucide-react";
import { VenueCard } from "~/components/cards/venue-card";
import {
  EmptyState,
  ResponsiveGrid,
} from "~/components/layout/responsive-grid";

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
  avgRating: number | null;
  reviewCount: number;
  upcomingShowCount: number;
  distance?: number;
  amenities: string | null;
  website?: string | null;
  address: string | null;
  venueType: string | null;
  imageUrl: string | null;
}

interface VenueGridClientProps {
  venues: Venue[];
}

export function VenueGridClient({ venues }: VenueGridClientProps) {
  const handleFavorite = (venueId: string) => {
    // TODO: Implement favorite functionality
    console.log("Favoriting venue:", venueId);
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
  );
}
