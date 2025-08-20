import { db } from "@repo/database";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Query real data from database
    const [showCount, artistCount, voteCount, userCount, upcomingShowCount] =
      await Promise.all([
        // Total shows
        db.execute(sql`SELECT COUNT(*) as count FROM shows`),
        // Total artists
        db.execute(sql`SELECT COUNT(*) as count FROM artists`),
        // Total votes
        db.execute(sql`SELECT COUNT(*) as count FROM votes`),
        // Total users
        db.execute(sql`SELECT COUNT(*) as count FROM user_profiles`),
        // Upcoming shows (shows with date >= today)
        db.execute(sql`
        SELECT COUNT(*) as count 
        FROM shows 
        WHERE date >= CURRENT_DATE 
        AND status != 'cancelled'
      `),
      ]);

    // Format the stats with real numbers
    const formatNumber = (num: number) => {
      if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}k+`;
      }
      return num.toString();
    };

    const stats = {
      activeArtists: formatNumber(Number((artistCount[0] as any)?.count || 0)),
      votesCast: formatNumber(Number((voteCount[0] as any)?.count || 0)),
      musicFans: formatNumber(Number((userCount[0] as any)?.count || 0)),
      activeShows: formatNumber(
        Number((upcomingShowCount[0] as any)?.count || 0),
      ),
      // Additional stats for debugging
      totalShows: Number((showCount[0] as any)?.count || 0),
      upcomingShows: Number((upcomingShowCount[0] as any)?.count || 0),
    };

    const response = NextResponse.json({
      stats,
      timestamp: new Date().toISOString(),
    });

    // Add cache headers for performance (shorter cache for real data)
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600",
    );

    return response;
  } catch (error) {
    console.error("Failed to fetch stats:", error);

    // Return fallback stats on error
    const fallbackStats = {
      activeArtists: "14",
      votesCast: "0",
      musicFans: "0",
      activeShows: "136",
    };

    return NextResponse.json({
      stats: fallbackStats,
      timestamp: new Date().toISOString(),
      error: true,
    });
  }
}
