import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "~/lib/supabase/server";
import type { TrendingShow, TrendingShowsResponse } from "~/types/api";
import { calculateShowGrowth } from "@repo/database";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const timeframe = searchParams.get("timeframe") || "week"; // day, week, month

    // Determine timeframe start date
    const now = new Date();
    let startDate: Date;
    switch (timeframe) {
      case "day":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    const supabase = createServiceClient();

    // Get trending shows with proper joins for artist and venue information
    const { data: raw, error } = await supabase
      .from("shows")
      .select(
        `
        id,
        name,
        slug,
        date,
        status,
        vote_count,
        attendee_count,
        view_count,
        trending_score,
        setlist_count,
        headliner_artist_id,
        venue_id,
        previous_view_count,
        previous_attendee_count,
        previous_vote_count,
        previous_setlist_count
      `,
      )
      .gt("trending_score", 0)
      .order("trending_score", { ascending: false, nullsFirst: false })
      .order("attendee_count", { ascending: false, nullsFirst: false })
      .order("view_count", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw error;

    // Get artist and venue data for the shows
    const artistIds = [...new Set(raw?.map(s => s.headliner_artist_id).filter(Boolean))];
    const venueIds = [...new Set(raw?.map(s => s.venue_id).filter(Boolean))];

    const [artistsData, venuesData] = await Promise.all([
      artistIds.length > 0 ? supabase
        .from("artists")
        .select("id, name, slug, image_url")
        .in("id", artistIds) : Promise.resolve({ data: [] }),
      venueIds.length > 0 ? supabase
        .from("venues")
        .select("id, name, city, state, country")
        .in("id", venueIds) : Promise.resolve({ data: [] })
    ]);

    const artistsMap = new Map((artistsData.data || []).map(a => [a.id, a]));
    const venuesMap = new Map((venuesData.data || []).map(v => [v.id, v]));

    const formatted: TrendingShow[] = ((raw || []) as any[]).map((s, idx) => {
      // Get the headliner artist and venue from the fetched data
      const artist = s.headliner_artist_id ? artistsMap.get(s.headliner_artist_id) : null;
      const venue = s.venue_id ? venuesMap.get(s.venue_id) : null;

      // Fallback trending score if null
      const score =
        s.trending_score ?? (s.vote_count ?? 0) * 2 + (s.attendee_count ?? 0);
      // Calculate real growth using historical data (no fake calculations)
      const realGrowth = calculateShowGrowth({
        viewCount: s.view_count ?? 0,
        previousViewCount: s.previous_view_count,
        attendeeCount: s.attendee_count ?? 0,
        previousAttendeeCount: s.previous_attendee_count,
        voteCount: s.vote_count ?? 0,
        previousVoteCount: s.previous_vote_count,
        setlistCount: s.setlist_count ?? 0,
        previousSetlistCount: s.previous_setlist_count,
      });

      // Use real growth data only (0 if no historical data available)
      const weeklyGrowth = realGrowth.overallGrowth;
      return {
        id: s.id,
        name: s.name || (artist?.name ? `${artist.name} Live` : "Unknown Show"),
        slug: s.slug,
        date: s.date,
        status: s.status || "confirmed",
        artist: {
          name: artist?.name || "Unknown Artist",
          slug: artist?.slug || "",
          imageUrl: artist?.image_url || null,
        },
        venue: {
          name: venue?.name || null,
          city: venue?.city || null,
          state: venue?.state || null,
        },
        voteCount: s.vote_count ?? 0,
        attendeeCount: s.attendee_count ?? 0,
        trendingScore: score,
        weeklyGrowth: Number(weeklyGrowth.toFixed(1)),
        rank: idx + 1,
      };
    });

    const payload: TrendingShowsResponse = {
      shows: formatted,
      timeframe,
      total: formatted.length,
      generatedAt: new Date().toISOString(),
    };

    const response = NextResponse.json(payload);

    // Add cache headers
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600",
    );

    return response;
  } catch (_error) {
    // Return empty array with fallback data instead of error
    const fallbackPayload: TrendingShowsResponse = {
      shows: [],
      timeframe: request.nextUrl.searchParams.get("timeframe") || "week",
      total: 0,
      generatedAt: new Date().toISOString(),
      fallback: true,
      error: "Unable to load trending shows at this time",
    };

    return NextResponse.json(fallbackPayload, {
      status: 200, // Return 200 to prevent UI crashes
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  }
}
