"use client";

import { Suspense } from "react";
import {
  EnhancedContentSlider,
  EnhancedContentSliderItem,
} from "~/components/ui/enhanced-content-slider";
import EnhancedErrorBoundary from "~/components/ui/enhanced-error-boundary";
import EnhancedLoadingSkeleton from "~/components/ui/enhanced-loading-skeleton";
import OptimizedArtistCard from "~/components/ui/optimized-artist-card";

interface TrendingArtist {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  followers: number;
  popularity: number;
  trendingScore: number;
  genres: string[];
  recentShows: number;
  weeklyGrowth: number;
  rank: number;
}

interface OptimizedTopArtistsSliderProps {
  artists: TrendingArtist[];
  isLoading?: boolean;
  error?: string | null;
}

function OptimizedTopArtistsSlider({
  artists,
  isLoading = false,
  error = null,
}: OptimizedTopArtistsSliderProps) {
  if (isLoading) {
    return <EnhancedLoadingSkeleton variant="artists" count={6} />;
  }

  if (error) {
    return (
      <div className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
              Trending Artists
            </h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!artists || artists.length === 0) {
    return (
      <div className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
              Trending Artists
            </h2>
            <p className="text-muted-foreground">
              No trending artists found. Check back soon for updates!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <EnhancedContentSlider
      title="Trending Artists"
      subtitle="Vote for your favorite artists and shape their setlists"
      viewAllLink="/artists"
      viewAllText="Discover More Artists"
      autoPlay={true}
      autoPlayInterval={4000}
      itemsPerView={{
        mobile: 1.5,
        tablet: 3,
        desktop: 5,
        wide: 7,
      }}
      className="bg-gradient-to-b from-background via-background/95 to-background"
      isLoading={isLoading}
      error={error}
    >
      {artists.map((artist, index) => (
        <EnhancedContentSliderItem key={artist.id}>
          <OptimizedArtistCard
            artist={artist}
            index={index}
            priority={index < 4}
            showRank={true}
            showStats={true}
            variant="default"
          />
        </EnhancedContentSliderItem>
      ))}
    </EnhancedContentSlider>
  );
}

// Export with error boundary and suspense
export default function OptimizedTopArtistsSliderWithBoundary(
  props: OptimizedTopArtistsSliderProps,
) {
  return (
    <EnhancedErrorBoundary level="section">
      <Suspense
        fallback={<EnhancedLoadingSkeleton variant="artists" count={6} />}
      >
        <OptimizedTopArtistsSlider {...props} />
      </Suspense>
    </EnhancedErrorBoundary>
  );
}
