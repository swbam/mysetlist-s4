import React from 'react';
import { absoluteUrl } from '~/lib/absolute-url';
import PopularVenuesSlider from './popular-venues-slider';
import type { TrendingVenuesResponse } from '~/types/api';

export default async function PopularVenuesWrapper() {
  try {
    const res = await fetch(
      absoluteUrl('/api/trending/venues?timeframe=week&limit=12'),
      { 
        next: { revalidate: 300 }, // Venues change less frequently
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );

    if (!res.ok) {
      console.warn(`Failed to fetch popular venues: ${res.status} ${res.statusText}`);
      return (
        <div className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
                Popular Venues
              </h2>
              <p className="text-muted-foreground">Unable to load popular venues at the moment. Please try again later.</p>
            </div>
          </div>
        </div>
      );
    }

    const data = await res.json();
    const { venues } = data as TrendingVenuesResponse;

    if (!venues || venues.length === 0) {
      return (
        <div className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
                Popular Venues
              </h2>
              <p className="text-muted-foreground">No popular venues found. Check back soon for updates!</p>
            </div>
          </div>
        </div>
      );
    }

    return <PopularVenuesSlider venues={venues} />;
  } catch (error) {
    console.error('Error fetching popular venues:', error);
    // Return minimal error state instead of null to prevent layout shift
    return (
      <div className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
              Popular Venues
            </h2>
            <p className="text-muted-foreground">Something went wrong. Please refresh the page.</p>
          </div>
        </div>
      </div>
    );
  }
}