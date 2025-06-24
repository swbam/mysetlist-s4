'use client';

import { VenueMapWrapper } from './venue-map-wrapper';

interface Venue {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  upcomingShowCount?: number;
}

interface VenuePageWrapperProps {
  venues: Venue[];
  children: React.ReactNode;
}

export function VenuePageWrapper({ venues, children }: VenuePageWrapperProps) {
  // Filter out venues without coordinates for map display
  const mappableVenues = venues
    .filter(v => v.latitude !== null && v.longitude !== null)
    .map(v => ({
      id: v.id,
      name: v.name,
      latitude: v.latitude as number,
      longitude: v.longitude as number,
      address: v.address || '',
      showCount: v.upcomingShowCount,
    }));

  return (
    <VenueMapWrapper venues={mappableVenues}>
      {children}
    </VenueMapWrapper>
  );
}