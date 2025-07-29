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

export default async function TopArtistsWrapperOptimized() {
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
        <OptimizedTopArtistsSliderWithBoundary
          artists={[]}
          error="Unable to load trending artists at the moment. Please try again later."
        />
      );
    }

    const data = await res.json();
    const { artists } = data as { artists: TrendingArtist[] };

    return <OptimizedTopArtistsSliderWithBoundary artists={artists || []} />;
  } catch (error) {
    console.error("Error fetching trending artists:", error);
    return (
      <OptimizedTopArtistsSliderWithBoundary
        artists={[]}
        error="Something went wrong. Please refresh the page."
      />
    );
  }
}
