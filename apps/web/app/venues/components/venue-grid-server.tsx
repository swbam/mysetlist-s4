import { getVenues } from '../actions';
import { VenueGridClient } from './venue-grid-client';

interface VenueGridServerProps {
  searchParams: {
    q?: string;
    types?: string;
    capacity?: string;
    lat?: string;
    lng?: string;
  };
}

export async function VenueGridServer({ searchParams }: VenueGridServerProps) {
  const venues = await getVenues({
    search: searchParams.q,
    types: searchParams.types?.split(',').filter(Boolean),
    capacity: searchParams.capacity,
    userLat: searchParams.lat ? parseFloat(searchParams.lat) : undefined,
    userLng: searchParams.lng ? parseFloat(searchParams.lng) : undefined,
  });

  return <VenueGridClient venues={venues.map(venue => ({
    ...venue,
    avgRating: venue.avgRating ?? undefined
  }))} />;
}