import { type NextRequest, NextResponse } from "next/server";
import { getWeeklyTrending } from "~/lib/trending-server";
import { CACHE_DURATIONS, getCacheHeaders } from "~/lib/cache";

export async function GET(request: NextRequest) {
  try {
    const data = await getWeeklyTrending();
    const trending = [
      ...data.shows.map(s => ({ ...s, type: 'show' as const })),
      ...data.artists.map(a => ({ ...a, type: 'artist' as const }))
    ];
    
    return NextResponse.json(
      { trending },
      { 
        headers: getCacheHeaders(CACHE_DURATIONS.trending, ["trending"]) 
      }
    );
  } catch (error) {
    console.error("Failed to fetch trending data:", error);
    return NextResponse.json(
      { trending: [], error: "Failed to fetch trending data" },
      { status: 500 }
    );
  }
}