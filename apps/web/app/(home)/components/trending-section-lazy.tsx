"use client";

import { Suspense, lazy } from "react";

// Lazy load all trending components
const TrendingArtists = lazy(() =>
  import("./trending-artists").then((mod) => ({
    default: mod.TrendingArtists,
  })),
);

const TrendingShows = lazy(() =>
  import("./trending").then((mod) => ({
    default: mod.Trending,
  })),
);

// Simple loading skeleton
function TrendingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}

export default function TrendingSectionLazy() {
  return (
    <>
      {/* Trending Artists Section */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight">
              Trending Artists
            </h2>
            <p className="text-muted-foreground mt-2">
              Discover the hottest artists that fans are talking about
            </p>
          </div>
          <Suspense fallback={<TrendingSkeleton />}>
            <TrendingArtists />
          </Suspense>
        </div>
      </section>

      {/* Trending Shows Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight">
              Trending Shows
            </h2>
            <p className="text-muted-foreground mt-2">
              Join the conversation about the most popular shows
            </p>
          </div>
          <Suspense fallback={<TrendingSkeleton />}>
            <TrendingShows />
          </Suspense>
        </div>
      </section>
    </>
  );
}
