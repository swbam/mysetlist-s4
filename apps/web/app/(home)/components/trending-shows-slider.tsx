import { absoluteUrl } from '@/lib/absolute-url';
import type { TrendingShowsResponse } from '@/types/api';
import TrendingShowsCarousel from './trending-shows-carousel';

export async function TrendingShowsSlider() {
  try {
    const res = await fetch(
      absoluteUrl(`/api/trending/shows?timeframe=week&limit=12`),
      { next: { revalidate: 60 } }
    );

    if (!res.ok) {
      console.warn('Failed to fetch trending shows:', res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    const { shows } = data as TrendingShowsResponse;
    
    if (!shows || shows.length === 0) {
      console.info('No trending shows found');
      return null;
    }

    return <TrendingShowsCarousel shows={shows} />;
  } catch (error) {
    console.error('Error fetching trending shows:', error);
    // Return null instead of throwing to prevent homepage crash
    return null;
  }
}
