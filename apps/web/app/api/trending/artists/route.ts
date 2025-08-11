import { type NextRequest, NextResponse } from "next/server";
import {
  getDailyTrending,
  getMonthlyTrending,
  getWeeklyTrending,
} from "~/lib/trending";
import { rateLimitMiddleware } from "~/middleware/rate-limit";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || searchParams.get("timeframe") || "week";
    const limit = Number.parseInt(searchParams.get("limit") || "20");

    let data;

    switch (period) {
      case "day":
        data = await getDailyTrending(limit);
        break;
      case "week":
        data = await getWeeklyTrending(limit);
        break;
      case "month":
        data = await getMonthlyTrending(limit);
        break;
      default:
        data = await getWeeklyTrending(limit);
        break;
    }

    // Return only artists data
    const response = data.artists || [];

    const jsonResponse = NextResponse.json({
      period,
      limit,
      type: "artists",
      data: response,
      timestamp: new Date().toISOString(),
    });

    // Add cache headers
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