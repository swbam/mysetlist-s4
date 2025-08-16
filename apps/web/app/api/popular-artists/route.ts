import { type NextRequest, NextResponse } from "next/server";
import { getTrendingArtists } from "~/lib/trending";
import { rateLimitMiddleware } from "~/middleware/rate-limit";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Apply rate limiting (skip in dev - handled by security middleware early return)
  if (process.env.NODE_ENV !== "development") {
    const rateLimitResult = await rateLimitMiddleware(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "20");

    // Get trending artists - this serves as "popular" artists
    const artists = await getTrendingArtists({
      timeWindow: 720, // 30 days for more stability in "popular"
      weightVotes: 2.0,
      weightAttendees: 1.5,
      weightRecency: 0.8, // Lower recency weight for popular (vs trending)
      limit,
    });

    const jsonResponse = NextResponse.json({
      limit,
      type: "popular-artists",
      artists: artists, // Change 'data' to 'artists' to match frontend expectations

      timestamp: new Date().toISOString(),
    });

    // Add cache headers - longer cache for popular vs trending
    jsonResponse.headers.set(
      "Cache-Control",
      "public, s-maxage=600, stale-while-revalidate=1200",
    );

    return jsonResponse;
  } catch (error) {
    console.error("Error fetching popular artists:", error);
    return NextResponse.json(
      { error: "Failed to fetch popular artists" },
      { status: 500 },
    );
  }
}
