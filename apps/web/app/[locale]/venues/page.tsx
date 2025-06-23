import { getDictionary } from '@repo/internationalization';
import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VenueSearch } from './components/venue-search';
import { VenueGridServer } from './components/venue-grid-server';
import { VenueMapWrapper } from './components/venue-map-wrapper';
import { Skeleton } from '@repo/design-system/components/ui/skeleton';

type VenuesPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const generateMetadata = async ({
  params,
}: VenuesPageProps): Promise<Metadata> => {
  const { locale } = await params;
  
  return createMetadata({
    title: 'Venues - TheSet',
    description: 'Explore concert venues, get insider tips, and plan your perfect show experience',
  });
};

const VenuesPage = async ({ params, searchParams }: VenuesPageProps) => {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);
  const search = await searchParams;

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
          
          <VenueMapWrapper>
            <Suspense fallback={<VenueSearchSkeleton />}>
              <VenueGridServer searchParams={search} />
            </Suspense>
          </VenueMapWrapper>
        </div>
      </div>
    </div>
  );
};

function VenueSearchSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>
  );
}

export default VenuesPage;