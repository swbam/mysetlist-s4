import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';

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

// ... existing code ...
