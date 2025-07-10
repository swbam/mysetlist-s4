import { absoluteUrl } from '~/lib/absolute-url';
import type { TrendingShowsResponse } from '~/types/api';
import TrendingShowsCarousel from './trending-shows-carousel';

export async function TrendingShowsSlider() {
  try {
    const res = await fetch(
      absoluteUrl('/api/trending/shows?timeframe=week&limit=12'),
      { 
        next: { revalidate: 60 },
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );

    if (!res.ok) {
      console.warn(`Failed to fetch trending shows: ${res.status} ${res.statusText}`);
      return (
        <div className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
                Trending Shows
              </h2>
              <p className="text-muted-foreground">Unable to load trending shows at the moment. Please try again later.</p>
            </div>
          </div>
        </div>
      );
    }

    const data = await res.json();
    const { shows } = data as TrendingShowsResponse;

    if (!shows || shows.length === 0) {
      return (
        <div className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
                Trending Shows
              </h2>
              <p className="text-muted-foreground">No trending shows found. Check back soon for updates!</p>
            </div>
          </div>
        </div>
      );
    }

    return <TrendingShowsCarousel shows={shows} />;
  } catch (error) {
    console.error('Error fetching trending shows:', error);
    // Return minimal error state instead of null to prevent layout shift
    return (
      <div className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
              Trending Shows
            </h2>
            <p className="text-muted-foreground">Something went wrong. Please refresh the page.</p>
          </div>
        </div>
      </div>
    );
  }
}
