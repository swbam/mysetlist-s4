import { db } from "@repo/database";
import { sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "~/lib/supabase/server";
import { rateLimitMiddleware } from "~/middleware/rate-limit";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

// No mock data - all trending artists come from real database

async function getTrendingArtistsFromDB(limit: number) {
  try {
    const supabase = createServiceClient();

    // Get artists with highest trending scores
    const { data: artists, error } = await supabase
      .from("artists")
      .select(
        `
        id,
        name,
        slug,
        image_url,
        popularity,
        followers,
        follower_count,
        trending_score,
        genres,
        total_shows,
        upcoming_shows,
        previous_followers,
        previous_popularity,
        created_at,
        updated_at
      `,
      )
      .gt("trending_score", 0)
      .order("trending_score", { ascending: false })
      .limit(limit);

    if (error || !artists || artists.length === 0) {
      // Attempt a best-effort recalculation to keep homepage fresh
      try {
        await db.execute(sql`SELECT update_trending_scores()`);
      } catch {}
      const { data: artistsRetry } = await supabase
        .from("artists")
        .select(
          "id,name,slug,image_url,popularity,followers,follower_count,trending_score,genres,total_shows,upcoming_shows,previous_followers,previous_popularity,created_at,updated_at",
        )
        .gt("trending_score", 0)
        .order("trending_score", { ascending: false })
        .limit(limit);
      return (artistsRetry || []).map(transformArtist);
    }

    // Transform to match frontend interface
    return artists.map(transformArtist);
  } catch (dbError) {
    console.error("Database connection failed:", dbError);
    // Return empty array on database failure instead of mock data
    return [];
  }
}

// Transform function to match frontend interface
function transformArtist(artist: any) {
  // Calculate weekly growth based on previous data
  const currentFollowers = artist.followers || artist.follower_count || 0;
  const previousFollowers = artist.previous_followers || currentFollowers;
  const weeklyGrowth =
    previousFollowers > 0
      ? ((currentFollowers - previousFollowers) / previousFollowers) * 100
      : 0;

  // Parse genres from JSON string
  let genres: string[] = [];
  if (artist.genres) {
    try {
      genres =
        typeof artist.genres === "string"
          ? JSON.parse(artist.genres)
          : artist.genres;
    } catch {
      genres = [];
    }
  }

  return {
    id: artist.id,
    name: artist.name,
    slug: artist.slug,
    imageUrl: artist.image_url,
    followers: currentFollowers,
    popularity: artist.popularity || 0,
    trendingScore: artist.trending_score || 0,
    genres,
    recentShows: artist.upcoming_shows || 0,
    weeklyGrowth: Number(weeklyGrowth.toFixed(1)),
  };
}

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimitMiddleware(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "20");

    const artists = await getTrendingArtistsFromDB(limit);

    const jsonResponse = NextResponse.json({
      artists,
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
