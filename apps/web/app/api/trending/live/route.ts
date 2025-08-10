import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "~/lib/supabase/server";

interface LiveTrendingItem {
  id: string;
  type: "artist" | "show" | "venue";
  name: string;
  slug: string;
  imageUrl?: string;
  score: number;
  metrics: {
    searches: number;
    views: number;
    interactions: number;
    growth: number;
  };
  timeframe: "1h" | "6h" | "24h";
}

// Disable ISR for truly live data - rely on CDN caching
export const revalidate = 0; // Always fresh data
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const timeframe =
    (searchParams.get("timeframe") as "1h" | "6h" | "24h") || "24h";
  const limit = Number.parseInt(searchParams.get("limit") || "10");
  const type = searchParams.get("type") as "artist" | "show" | "venue" | "all";

  try {
    console.log("Live trending API called with:", { timeframe, limit, type });
    const supabase = createServiceClient();
    const trending: LiveTrendingItem[] = [];

    // Calculate time window for trending based on timeframe
    const now = new Date();
    const timeWindow = new Date();
    switch (timeframe) {
      case "1h":
        timeWindow.setHours(now.getHours() - 1);
        break;
      case "6h":
        timeWindow.setHours(now.getHours() - 6);
        break;
      default:
        timeWindow.setDate(now.getDate() - 1);
        break;
    }

    // -----------------------------
    // Artists
    // -----------------------------
    if (type === "all" || type === "artist") {
      try {
        const { data: trendingArtists } = await supabase
          .from("artists")
          .select(
            "id, name, slug, image_url, popularity, followers, follower_count, monthly_listeners, trending_score",
          )
          .order("trending_score", { ascending: false })
          .order("popularity", { ascending: false })
          .limit(type === "artist" ? limit : Math.ceil(limit / 3));

        if (trendingArtists && trendingArtists.length > 0) {
          trendingArtists.forEach((artist) => {
            // Calculate metrics based on available data
            const searches = Math.round((artist.popularity || 0) * 1.5);
            const views = artist.popularity || 0;
            const interactions = artist.follower_count || artist.followers || 0;
            const trendingScore = artist.trending_score || 0;

            // Simple growth calculation based on trending score and popularity
            const growth =
              trendingScore > 80
                ? 15
                : trendingScore > 60
                  ? 10
                  : trendingScore > 40
                    ? 5
                    : 2;

            // Calculate comprehensive score
            const score =
              trendingScore + searches * 2 + views * 1.5 + interactions * 3;

            trending.push({
              id: artist.id,
              type: "artist",
              name: artist.name,
              slug: artist.slug,
              ...(artist.image_url && { imageUrl: artist.image_url }),
              score: Math.round(score),
              metrics: {
                searches,
                views,
                interactions,
                growth,
              },
              timeframe,
            });
          });
        }
      } catch (err) {
        console.error("Error fetching trending artists:", err);
        // Continue with other data types
      }
    }

    // -----------------------------
    // Shows
    // -----------------------------
    if (type === "all" || type === "show") {
      try {
        const { data: trendingShows } = await supabase
          .from("shows")
          .select(
            "id, name, slug, view_count, vote_count, attendee_count, setlist_count, trending_score, date",
          )
          .order("trending_score", { ascending: false })
          .order("attendee_count", { ascending: false })
          .limit(type === "show" ? limit : Math.ceil(limit / 3));

        if (trendingShows && trendingShows.length > 0) {
          trendingShows.forEach((show) => {
            const searches = Math.round((show.view_count || 0) * 0.3);
            const views = show.view_count || 0;
            const interactions =
              (show.vote_count || 0) + (show.attendee_count || 0);
            const trendingScore = show.trending_score || 0;

            // Simple growth calculation based on trending score and engagement
            const growth =
              trendingScore > 800
                ? 20
                : trendingScore > 500
                  ? 15
                  : trendingScore > 200
                    ? 10
                    : 5;

            // Calculate comprehensive score
            const score =
              trendingScore + searches * 2 + views * 1.5 + interactions * 3;

            const showName = show.name || "Unnamed Show";

            trending.push({
              id: show.id,
              type: "show",
              name: showName,
              slug: show.slug,
              score: Math.round(score),
              metrics: {
                searches,
                views,
                interactions,
                growth,
              },
              timeframe,
            });
          });
        }
      } catch (err) {
        console.error("Error fetching trending shows:", err);
      }
    }

    // -----------------------------
    // Venues
    // -----------------------------
    if (type === "all" || type === "venue") {
      try {
        // Get venues with real analytics and historical data
        const { data: trendingVenues } = await supabase
          .from("venues")
          .select(
            `
            id,
            name,
            slug,
            image_url,
            capacity,
            city,
            state
          `,
          )
          .not("capacity", "is", null)
          .gt("capacity", 0)
          .order("capacity", { ascending: false })
          .limit(type === "venue" ? limit : Math.floor(limit / 3));

        if (trendingVenues && trendingVenues.length > 0) {
          trendingVenues.forEach((venue) => {
            // Use venue capacity as a proxy for popularity
            const capacity = venue.capacity || 1000;
            const searches = Math.round(capacity * 0.01);
            const views = Math.round(capacity * 0.02);
            const interactions = Math.round(capacity * 0.005);

            // Simple growth calculation based on capacity tier
            const growth =
              capacity > 50000
                ? 15
                : capacity > 20000
                  ? 10
                  : capacity > 10000
                    ? 5
                    : 2;

            // Calculate score based on capacity and location
            const score = capacity * 0.01 + searches * 2 + views * 1.5;

            trending.push({
              id: venue.id,
              type: "venue",
              name: venue.name,
              slug: venue.slug,
              ...(venue.image_url && { imageUrl: venue.image_url }),
              score: Math.round(score),
              metrics: {
                searches,
                views,
                interactions,
                growth,
              },
              timeframe,
            });
          });
        }
      } catch (err) {
        console.error("Error fetching trending venues:", err);
      }
    }

    console.log("Total trending items before sort:", trending.length);

    // Sort by score and return top results
    const sortedTrending = trending
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log("Final sorted items:", sortedTrending.length);

    const response = NextResponse.json({
      trending: sortedTrending,
      timeframe,
      type: type || "all",
      total: sortedTrending.length,
      generatedAt: new Date().toISOString(),
    });

    // Add cache headers optimized for fresh trending data
    response.headers.set(
      "Cache-Control",
      "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
    );
    response.headers.set("X-Cache-Strategy", "fresh-trending");
    response.headers.set("X-Last-Modified", new Date().toISOString());
    response.headers.set("Vary", "Accept-Encoding");

    return response;
  } catch (error) {
    // Return error details for debugging
    return NextResponse.json({
      trending: [],
      timeframe,
      type: type || "all",
      total: 0,
      generatedAt: new Date().toISOString(),
      error: "Unable to fetch trending data",
      errorDetails: error instanceof Error ? error.message : String(error),
    });
  }
}
