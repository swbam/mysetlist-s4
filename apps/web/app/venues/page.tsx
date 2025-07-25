import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import { ErrorBoundaryWrapper } from '~/components/error-boundary-wrapper';
import { ResponsiveGrid } from '~/components/layout/responsive-grid';
import { VenueSearch } from './components/venue-search';
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

  const formattedVenues = venues.map((venue) => ({
    id: venue.id,
    name: venue.name,
    slug: venue.slug,
    address: venue.address,
    city: venue.city,
    state: venue.state,
    country: venue.country,
    capacity: venue.capacity,
    venueType: venue.venueType,
    imageUrl: venue.imageUrl,
    avgRating: venue.avgRating ?? 0,
    reviewCount: venue.reviewCount,
    upcomingShowCount: venue.upcomingShowCount,
    distance: venue.distance,
    amenities: venue.amenities,
  }));

  return (
    <div className="space-y-6">
      <VenueSearch />
      <VenueGridClient venues={formattedVenues} />
    </div>
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

            <Suspense fallback={
              <div className="space-y-6">
                <div className="h-12 bg-muted rounded animate-pulse" />
                <ResponsiveGrid variant="venues" loading={true} loadingCount={9} />
              </div>
            }>
              <VenuesContent searchParams={resolvedSearchParams} />
            </Suspense>
          </div>
        </div>
      </div>
    </ErrorBoundaryWrapper>
  );
};

export default VenuesPage;
