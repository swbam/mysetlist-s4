import React from "react";
import { absoluteUrl } from "~/lib/absolute-url";
import FeaturedVenuesSlider from "./featured-venues-slider";

interface FeaturedVenue {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  city: string | null;
  state: string | null;
  country: string;
  capacity: number | null;
  upcomingShows: number;
  totalShows: number;
  trendingScore: number;
  weeklyGrowth: number;
  rank: number;
}

export default async function FeaturedVenuesWrapper() {
  try {
    const res = await fetch(
      absoluteUrl("/api/trending/venues?timeframe=week&limit=10"),
      {
        next: { revalidate: 60 },
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );

    if (!res.ok) {
      console.warn(
        `Failed to fetch featured venues: ${res.status} ${res.statusText}`,
      );
      return (
        <div className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
                Featured Venues
              </h2>
              <p className="text-muted-foreground">
                Unable to load featured venues at the moment. Please try again
                later.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const data = await res.json();
    const { venues } = data as { venues: FeaturedVenue[] };

    if (!venues || venues.length === 0) {
      return (
        <div className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
                Featured Venues
              </h2>
              <p className="text-muted-foreground">
                No featured venues found. Check back soon for updates!
              </p>
            </div>
          </div>
        </div>
      );
    }

    return <FeaturedVenuesSlider venues={venues} />;
  } catch (error) {
    console.error("Error fetching featured venues:", error);
    // Return minimal error state instead of null to prevent layout shift
    return (
      <div className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text font-bold text-3xl text-transparent tracking-tight md:text-4xl">
              Featured Venues
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
