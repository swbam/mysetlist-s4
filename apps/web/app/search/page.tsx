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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Search</h1>
        <p className="text-muted-foreground">
          Find artists, venues, shows, and songs on MySetlist
        </p>
      </div>
      
      <Suspense fallback={<div>Loading search...</div>}>
        <SearchInterface />
      </Suspense>
    </div>
  );
};

export default SearchPage; 