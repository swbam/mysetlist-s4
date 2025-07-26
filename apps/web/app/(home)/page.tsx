import { Suspense } from 'react';
import Hero from './components/hero';
import { TrendingArtists } from './components/trending-artists';
import { Trending as TrendingShows } from './components/trending';
import FeaturedContent from './components/featured-content';
import { HomeLoadingSkeleton } from './components/home-loading-skeleton';

export const metadata = {
  title: 'MySetlist - Concert Setlist Voting Platform',
  description: 'Vote on concert setlists, discover new artists, and connect with music fans worldwide.',
};

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <Suspense fallback={<HomeLoadingSkeleton />}>
        <Hero />
      </Suspense>

      {/* Trending Artists Section */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight">Trending Artists</h2>
            <p className="text-muted-foreground mt-2">
              Discover the hottest artists that fans are talking about
            </p>
          </div>
          <Suspense fallback={<HomeLoadingSkeleton />}>
            <TrendingArtists />
          </Suspense>
        </div>
      </section>

      {/* Trending Shows Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight">Trending Shows</h2>
            <p className="text-muted-foreground mt-2">
              Join the conversation about the most popular shows
            </p>
          </div>
          <Suspense fallback={<HomeLoadingSkeleton />}>
            <TrendingShows />
          </Suspense>
        </div>
      </section>

      {/* Featured Content */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <Suspense fallback={<HomeLoadingSkeleton />}>
            <FeaturedContent />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
