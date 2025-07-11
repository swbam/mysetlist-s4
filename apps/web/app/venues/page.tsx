import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import React, { Suspense } from 'react';
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
};

const VenuesPage = async ({ searchParams }: VenuesPageProps) => {
  const resolvedSearchParams = (await searchParams) || {};

  return React.createElement(ErrorBoundaryWrapper as any, {}, (
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

            {React.createElement(Suspense as any, {
              fallback: React.createElement(VenueGridLoadingSkeleton, { count: 6 })
            },
              React.createElement(VenuesContent, { searchParams: resolvedSearchParams })
            )}
          </div>
        </div>
      </div>
  ));
};

export default VenuesPage;
