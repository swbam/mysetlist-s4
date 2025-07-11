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
    ...(searchParams.q && { search: searchParams.q }),
    ...(searchParams.types && { types: searchParams.types.split(',').filter(Boolean) }),
    ...(searchParams.capacity && { capacity: searchParams.capacity }),
    ...(searchParams.lat && { userLat: Number.parseFloat(searchParams.lat) }),
    ...(searchParams.lng && { userLng: Number.parseFloat(searchParams.lng) }),
  });

  return (
    <VenueGridClient
      venues={venues.map((venue) => ({
        ...venue,
        avgRating: venue.avgRating ?? 0,
      }))}
    />
  );
}
