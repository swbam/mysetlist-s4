import { type NextRequest, NextResponse } from "next/server";
import { getTrendingArtists } from "~/lib/trending";
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
    const limit = Number.parseInt(searchParams.get("limit") || "20");

    // Get trending artists
    const artists = await getTrendingArtists({
      timeWindow: 168, // 7 days for trending
      weightVotes: 3.0,
      weightAttendees: 2.0,
      weightRecency: 1.5,
      limit,
    });

    const jsonResponse = NextResponse.json({
      limit,
      type: "trending-artists",
      artists: artists, // Ensure we return 'artists' key
      timestamp: new Date().toISOString(),
    });

    // Add cache headers - shorter cache for trending
    jsonResponse.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600",
    );

    return jsonResponse;
  } catch (error) {
    console.error("Error fetching trending artists:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending artists" },
      { status: 500 },
    );
  }
}