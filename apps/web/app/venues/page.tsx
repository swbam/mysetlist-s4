import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ErrorBoundaryWrapper } from '~/components/error-boundary-wrapper';
import { VenueGridSkeleton as VenueGridLoadingSkeleton } from '~/components/loading-states';
import { getVenues } from './actions';
import { VenueGridClient } from './components/venue-grid-client';

export const generateMetadata = async (): Promise<Metadata> => {
  return createMetadata({
    title: 'Venues - MySetlist',
    description:
      'Explore concert venues, get insider tips, and plan your perfect show experience',
  });
};

interface VenuesPageProps {
  searchParams?: Promise<{
    q?: string;
    types?: string;
    capacity?: string;
    lat?: string;
    lng?: string;
  }>;
}

const VenuesContent = async ({ searchParams }: { searchParams: any }) => {
  const venues = await getVenues({
    search: searchParams.q,
    types: searchParams.types?.split(',').filter(Boolean),
    capacity: searchParams.capacity,
    userLat: searchParams.lat ? Number.parseFloat(searchParams.lat) : undefined,
    userLng: searchParams.lng ? Number.parseFloat(searchParams.lng) : undefined,
  });

  return (
    <VenueGridClient
      venues={venues.map((venue) => ({
        ...venue,
        avgRating: venue.avgRating ?? undefined,
      }))}
    />
  );
};

const VenuesPage = async ({ searchParams }: VenuesPageProps) => {
  const resolvedSearchParams = (await searchParams) || {};

  return (
    <ErrorBoundaryWrapper>
      <div className="flex flex-col gap-8 py-8 md:py-16">
        <div className="container mx-auto">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h1 className="font-regular text-4xl tracking-tighter md:text-6xl">
                Discover Venues
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Find the best concert venues near you with insider tips, parking
                info, and more
              </p>
            </div>

            <Suspense fallback={<VenueGridLoadingSkeleton count={6} />}>
              <VenuesContent searchParams={resolvedSearchParams} />
            </Suspense>
          </div>
        </div>
      </div>
    </ErrorBoundaryWrapper>
  );
};

export default VenuesPage;
