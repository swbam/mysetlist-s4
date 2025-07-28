import React from "react";
import { absoluteUrl } from "~/lib/absolute-url";
import OptimizedTopArtistsSliderWithBoundary from "./optimized-top-artists-slider";

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

export default async function TopArtistsWrapper() {
  try {
    const res = await fetch(
      absoluteUrl("/api/trending/artists?timeframe=week&limit=12"),
      {
        next: { revalidate: 60 },
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );

    if (!res.ok) {
      console.warn(
        `Failed to fetch trending artists: ${res.status} ${res.statusText}`,
      );
      return (
        <div className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
                Trending Artists
              </h2>
              <p className="text-muted-foreground">
                Unable to load trending artists at the moment. Please try again
                later.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const data = await res.json();
    const { artists } = data as { artists: TrendingArtist[] };

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

    return <OptimizedTopArtistsSliderWithBoundary artists={artists} />;
  } catch (error) {
    console.error("Error fetching trending artists:", error);
    // Return minimal error state instead of null to prevent layout shift
    return (
      <div className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
              Trending Artists
            </h2>
            <p className="text-muted-foreground">
              Something went wrong. Please refresh the page.
            </p>
          </div>
        </div>
      </div>
    );
  }
}
