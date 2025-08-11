import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "~/lib/supabase/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

// Flatten structure to match frontend component expectations and fix hydration
interface TrendingShow {
  id: string;
  title: string;        // renamed from 'name' to match component
  slug: string;
  date?: string;
  status: "upcoming" | "ongoing" | "completed";
  artist_name?: string; // flattened from nested artist object
  venue?: string;       // flattened from nested venue object
  vote_count?: number;  // renamed from voteCount to match component
  attendee_count?: number;
  trendingScore: number;
  weeklyGrowth: number;
}

interface TrendingShowsResponse {
  shows: TrendingShow[];
  timeframe: string;
  total: number;
  generatedAt: string;
  fallback?: boolean;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const timeframe = searchParams.get("timeframe") || "week";

    const supabase = createServiceClient();

    // Get trending shows (simplified query)
    const { data: shows, error } = await supabase
      .from("shows")
      .select(`
        id,
        name,
        slug,
        date,
        status,
        vote_count,
        attendee_count,
        view_count,
        trending_score,
        headliner_artist_id,
        venue_id
      `)
      .gt("trending_score", 0)
      .order("trending_score", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching trending shows:", error);
      throw error;
    }

    if (!shows || shows.length === 0) {
      return NextResponse.json({
        shows: [],
        timeframe,
        total: 0,
        generatedAt: new Date().toISOString(),
        fallback: true,
        error: "No trending shows found",
      });
    }

    // Get related artists and venues
    const artistIds = [
      ...new Set(shows.map((s) => s.headliner_artist_id).filter(Boolean)),
    ];
    const venueIds = [...new Set(shows.map((s) => s.venue_id).filter(Boolean))];

    const [artistsResponse, venuesResponse] = await Promise.all([
      artistIds.length > 0
        ? supabase
            .from("artists")
            .select("id, name, slug, image_url")
            .in("id", artistIds)
        : Promise.resolve({ data: [] }),
      venueIds.length > 0
        ? supabase
            .from("venues")
            .select("id, name, city, state")
            .in("id", venueIds)
        : Promise.resolve({ data: [] }),
    ]);

    const artistsMap = new Map(
      (artistsResponse.data || []).map((a) => [a.id, a]),
    );
    const venuesMap = new Map(
      (venuesResponse.data || []).map((v) => [v.id, v]),
    );

    // Format the response with flattened structure to prevent hydration errors
    const formatted: TrendingShow[] = shows.map((show, index) => {
      const artist = show.headliner_artist_id
        ? artistsMap.get(show.headliner_artist_id)
        : null;
      const venue = show.venue_id ? venuesMap.get(show.venue_id) : null;

      // Create venue string combining name, city, state
      const venueString = venue 
        ? `${venue.name}${venue.city ? ` - ${venue.city}` : ''}${venue.state ? `, ${venue.state}` : ''}`
        : "Unknown Venue";

      return {
        id: show.id,
        title: show.name || `${artist?.name || "Unknown Artist"} Live`, // renamed to match component
        slug: show.slug,
        date: show.date,
        status: (show.status as any) || "upcoming",
        artist_name: artist?.name || "Unknown Artist", // flattened
        venue: venueString, // flattened to string
        vote_count: show.vote_count || 0, // renamed to match component
        attendee_count: show.attendee_count || 0,
        trendingScore: show.trending_score || 0,
        weeklyGrowth: 0, // Simplified - no growth calculation for now
      };
    });

    const response: TrendingShowsResponse = {
      shows: formatted,
      timeframe,
      total: formatted.length,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Trending shows API error:", error);

    const fallbackResponse: TrendingShowsResponse = {
      shows: [],
      timeframe: request.nextUrl.searchParams.get("timeframe") || "week",
      total: 0,
      generatedAt: new Date().toISOString(),
      fallback: true,
      error: "Unable to load trending shows at this time",
    };

    return NextResponse.json(fallbackResponse, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  }
}
