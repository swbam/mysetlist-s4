import { createServiceClient } from "~/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServiceClient();

    // Get counts for platform statistics
    const [
      { count: activeShows },
      { count: totalArtists },
      { count: totalVotes },
      { count: totalUsers },
    ] = await Promise.all([
      // Active shows (upcoming)
      supabase
        .from("shows")
        .select("*", { count: "exact", head: true })
        .gte("date", new Date().toISOString().split("T")[0]),

      // Total artists
      supabase.from("artists").select("*", { count: "exact", head: true }),

      // Total votes
      supabase.from("user_votes").select("*", { count: "exact", head: true }),

      // Total users
      supabase.from("users").select("*", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      activeShows: activeShows || 0,
      totalArtists: totalArtists || 0,
      totalVotes: totalVotes || 0,
      totalUsers: totalUsers || 0,
    });
  } catch (_error) {
    // Return zeros on error
    return NextResponse.json({
      activeShows: 0,
      totalArtists: 0,
      totalVotes: 0,
      totalUsers: 0,
    });
  }
}
