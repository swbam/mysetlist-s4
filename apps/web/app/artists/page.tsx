import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import React, { Suspense } from "react";
import { PageErrorBoundary } from "~/components/error-boundary-wrapper";
import { ResponsiveGrid } from "~/components/layout/responsive-grid";
import { TrendingListSkeleton } from "~/components/loading-states";
import { ArtistSearch } from "./components/artist-search";
import { PopularArtists } from "./components/popular-artists";
import { TrendingArtists } from "./components/trending-artists";

// Only use dynamic for this page since it needs real-time artist data
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const generateMetadata = (): Metadata => {
  return createMetadata({
    title: "Artists",
    description: "Discover and explore artists, their shows, and setlists.",
  });
};

export default function ArtistsPage() {
  return (
    <PageErrorBoundary>
      <div className="flex flex-col gap-8 py-8 md:py-16">
        <div className="container mx-auto">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h1 className="font-regular text-4xl tracking-tighter md:text-6xl">
                Discover Artists
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Search for your favorite artists to discover their upcoming
                shows and past setlists
              </p>
            </div>

            <ArtistSearch />

            {/* Trending Artists Section */}
            <div className="mt-12">
              <h2 className="mb-6 font-semibold text-2xl">Trending Artists</h2>
              {React.createElement(
                Suspense as any,
                {
                  fallback: <TrendingListSkeleton count={5} />,
                },
                <TrendingArtists />,
              )}
            </div>

            {/* Popular Artists Grid */}
            <div className="mt-12">
              <h2 className="mb-6 font-semibold text-2xl">Popular Artists</h2>
              {React.createElement(
                Suspense as any,
                {
                  fallback: (
                    <ResponsiveGrid variant="artists" loading loadingCount={12}>
                      {/* Loading skeleton handled internally */}
                    </ResponsiveGrid>
                  ),
                },
                <PopularArtists />,
              )}
            </div>

            <div className="py-16 text-center">
              <h2 className="mb-4 font-semibold text-2xl">How It Works</h2>
              <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-lg border p-6">
                  <div className="mb-2 text-3xl">🔍</div>
                  <h3 className="mb-2 font-semibold">Search Artists</h3>
                  <p className="text-muted-foreground text-sm">
                    Use the search above to find artists. We'll automatically
                    sync their data from Ticketmaster.
                  </p>
                </div>
                <div className="rounded-lg border p-6">
                  <div className="mb-2 text-3xl">🎵</div>
                  <h3 className="mb-2 font-semibold">Discover Shows</h3>
                  <p className="text-muted-foreground text-sm">
                    View upcoming concerts, venues, and ticket information for
                    your favorite artists.
                  </p>
                </div>
                <div className="rounded-lg border p-6">
                  <div className="mb-2 text-3xl">📝</div>
                  <h3 className="mb-2 font-semibold">Vote on Setlists</h3>
                  <p className="text-muted-foreground text-sm">
                    Help predict what songs artists will play at their upcoming
                    shows.
                  </p>
                </div>
              </div>
              <p className="mt-6 text-muted-foreground">
                Try searching for any artist to discover their upcoming shows
                and join the conversation about their setlists
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageErrorBoundary>
  );
}
