import { Suspense } from 'react';
import { SearchInterface } from './components/search-interface';
import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';

// Force dynamic rendering due to useSearchParams in SearchInterface component
export const dynamic = 'force-dynamic';

export const metadata: Metadata = createMetadata({
  title: 'Search Artists, Shows & Venues - MySetlist',
  description: 'Discover new artists, find upcoming shows, and explore venues on MySetlist.',
});

const SearchPage = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Search MySetlist</h1>
          <p className="text-lg text-muted-foreground">
            Discover artists, find upcoming shows, and explore venues
          </p>
        </div>

        <Suspense fallback={<div>Loading search...</div>}>
          <SearchInterface />
        </Suspense>
      </div>
    </div>
  );
};

export default SearchPage; 