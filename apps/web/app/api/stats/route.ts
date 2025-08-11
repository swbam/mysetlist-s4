import { NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function GET() {
  // Basic MVP stats - can be enhanced with real data later
  const stats = {
    activeArtists: "2,500+",
    votesCast: "10,000+", 
    musicFans: "5,000+",
    activeShows: "500+",
  };

  const response = NextResponse.json({
    stats,
    timestamp: new Date().toISOString(),
  });

  // Add cache headers for performance
  response.headers.set(
    "Cache-Control", 
    "public, s-maxage=600, stale-while-revalidate=1200"
  );

  return response;
}