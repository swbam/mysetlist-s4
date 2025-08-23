import { type NextRequest, NextResponse } from "next/server";
import {
  getHotVenues,
  getMostVotedSongs,
  getRecentSetlistActivity,
  getRisingArtists,
  getTrendingArtistsInsights,
  getTrendingLocations,
  getTrendingStatistics,
} from "~/lib/trending-insights";
import { rateLimitMiddleware } from "~/middleware/rate-limit";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "all";
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const timeframe =
      (searchParams.get("timeframe") as "week" | "month" | "all") || "week";

    let data: any = {};

    switch (type) {
      case "artists":
        data.artists = await getTrendingArtistsInsights(limit);
        break;
      case "songs":
        data.songs = await getMostVotedSongs(timeframe, limit);
        break;
      case "venues":
        data.venues = await getHotVenues(limit);
        break;
      case "activity":
        data.activity = await getRecentSetlistActivity(limit);
        break;
      case "locations":
        data.locations = await getTrendingLocations(limit);
        break;
      case "rising":
        data.rising = await getRisingArtists(limit);
        break;
      case "stats":
        data.stats = await getTrendingStatistics();
        break;
      default: {
        // Get all insights in parallel with optimized limits for overview
        const [artists, songs, venues, activity, locations, stats, rising] =
          await Promise.all([
            getTrendingArtistsInsights(Math.min(limit, 8)),
            getMostVotedSongs(timeframe, Math.min(limit, 12)),
            getHotVenues(Math.min(limit, 8)),
            getRecentSetlistActivity(Math.min(limit, 12)),
            getTrendingLocations(Math.min(limit, 6)),
            getTrendingStatistics(),
            getRisingArtists(Math.min(limit, 8)),
          ]);

        data = {
          artists,
          songs,
          venues,
          activity,
          locations,
          stats,
          rising,
          _metadata: {
            generated_at: new Date().toISOString(),
            cache_duration: "5 minutes",
            total_items: {
              artists: artists.length,
              songs: songs.length,
              venues: venues.length,
              activity: activity.length,
              locations: locations.length,
              rising: rising.length,
            },
          },
        };
        break;
      }
    }

    const jsonResponse = NextResponse.json({
      type,
      timeframe,
      limit,
      data,
      timestamp: new Date().toISOString(),
    });

    // Add cache headers - different caching strategies based on data type
    let cacheControl = "public, s-maxage=300, stale-while-revalidate=600"; // Default: 5min cache

    if (type === "stats") {
      // Statistics can be cached longer
      cacheControl = "public, s-maxage=600, stale-while-revalidate=1200"; // 10min cache
    } else if (type === "activity") {
      // Activity data should be fresher
      cacheControl = "public, s-maxage=180, stale-while-revalidate=360"; // 3min cache
    } else if (type === "songs" || type === "artists") {
      // Core trending data - moderate caching
      cacheControl = "public, s-maxage=300, stale-while-revalidate=600"; // 5min cache
    }

    jsonResponse.headers.set("Cache-Control", cacheControl);

    // Add performance headers
    jsonResponse.headers.set("X-Content-Type-Options", "nosniff");
    jsonResponse.headers.set("Vary", "Accept-Encoding");

    return jsonResponse;
  } catch (error) {
    console.error("Error fetching trending insights:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending insights" },
      { status: 500 },
    );
  }
}
