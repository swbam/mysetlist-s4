"use client";

import React, { Suspense } from "react";
import { ArtistCard, Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, Skeleton } from "@repo/design-system";

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

function LoadingSkeleton() {
  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-48 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function OptimizedTopArtistsSlider({
  artists,
  isLoading = false,
  error = null,
}: OptimizedTopArtistsSliderProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
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
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
            Trending Artists
          </h2>
          <p className="text-muted-foreground">
            Vote for your favorite artists and shape their setlists
          </p>
        </div>
        
        <Carousel className="w-full">
          <CarouselContent className="-ml-1">
            {artists.map((artist, index) => (
              <CarouselItem key={artist.id} className="pl-1 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                <ArtistCard
                  id={artist.id}
                  name={artist.name}
                  slug={artist.slug}
                  imageUrl={artist.imageUrl}
                  genres={artist.genres}
                  followers={artist.followers}
                  popularity={artist.popularity}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </div>
  );
}

// Export with simple error boundary
export default function OptimizedTopArtistsSliderWithBoundary(
  props: OptimizedTopArtistsSliderProps,
) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <OptimizedTopArtistsSlider {...props} />
    </Suspense>
  );
}