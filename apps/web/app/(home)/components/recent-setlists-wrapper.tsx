import React from 'react';
import { absoluteUrl } from '~/lib/absolute-url';
import RecentSetlistsSlider from './recent-setlists-slider';
import type { RecentSetlistsResponse } from '~/types/api';

export default async function RecentSetlistsWrapper() {
  try {
    const res = await fetch(
      absoluteUrl('/api/setlists?timeframe=week&limit=10'),
      { 
        next: { revalidate: 120 }, // Setlists are quite dynamic
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
        },
      }
    );

    if (!res.ok) {
      console.warn(`Failed to fetch recent setlists: ${res.status} ${res.statusText}`);
      return (
        <div className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
                Recent Setlists
              </h2>
              <p className="text-muted-foreground">Unable to load recent setlists at the moment. Please try again later.</p>
            </div>
          </div>
        </div>
      );
    }

    const data = await res.json();
    const { setlists } = data as RecentSetlistsResponse;

    if (!setlists || setlists.length === 0) {
      return (
        <div className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
                Recent Setlists
              </h2>
              <p className="text-muted-foreground">No recent setlists found. Check back soon for updates!</p>
            </div>
          </div>
        </div>
      );
    }

    return <RecentSetlistsSlider setlists={setlists} />;
  } catch (error) {
    console.error('Error fetching recent setlists:', error);
    // Return minimal error state instead of null to prevent layout shift
    return (
      <div className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
              Recent Setlists
            </h2>
            <p className="text-muted-foreground">Something went wrong. Please refresh the page.</p>
          </div>
        </div>
      </div>
    );
  }
}