import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import { VenuePageWrapper } from './components/venue-page-wrapper';
import { VenueGridServer } from './components/venue-grid-server';
import { VenueGridClient } from './components/venue-grid-client';
import { getVenues } from './actions';
import { Suspense } from 'react';
import { Card } from '@repo/design-system/components/ui/card';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';

export const generateMetadata = async (): Promise<Metadata> => {
  return createMetadata({
    title: 'Venues - MySetlist',
    description: 'Explore concert venues, get insider tips, and plan your perfect show experience',
  });
};

interface VenuesPageProps {
  searchParams: {
    q?: string;
    types?: string;
    capacity?: string;
    lat?: string;
    lng?: string;
  };
}

function VenueGridSkeleton() {
  return (
    <div className="grid gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="overflow-hidden">
          <div className="flex">
            <Skeleton className="w-48 h-48 flex-shrink-0" />
            <div className="flex-1 p-6">
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

const VenuesPage = async ({ searchParams }: VenuesPageProps) => {
  const venues = await getVenues({
    search: searchParams.q,
    types: searchParams.types?.split(',').filter(Boolean),
    capacity: searchParams.capacity,
    userLat: searchParams.lat ? parseFloat(searchParams.lat) : undefined,
    userLng: searchParams.lng ? parseFloat(searchParams.lng) : undefined,
  });

  return (
    <div className="flex flex-col gap-8 py-8 md:py-16">
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h1 className="font-regular text-4xl tracking-tighter md:text-6xl">
              Discover Venues
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Find the best concert venues near you with insider tips, parking info, and more
            </p>
          </div>
          
          <VenuePageWrapper venues={venues}>
            <VenueGridClient venues={venues.map(venue => ({
              ...venue,
              avgRating: venue.avgRating ?? undefined
            }))} />
          </VenuePageWrapper>
        </div>
      </div>
    </div>
  );
};

export default VenuesPage;