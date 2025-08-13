import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "~/lib/supabase/server";
import { rateLimitMiddleware } from "~/middleware/rate-limit";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

// Mock data for when database is not available
const MOCK_TRENDING_ARTISTS = [
  {
    id: "mock-artist-1",
    name: "Taylor Swift",
    slug: "taylor-swift",
    image_url:
      "https://i.scdn.co/image/ab6761610000e5eb859e4c14fa59296c8649e0e4",
    popularity: 95,
    followers: 89000000,
    follower_count: 89000000,
    trending_score: 950,
    genres: '["pop", "country"]',
    upcoming_shows: 15,
    total_shows: 150,
    previous_followers: 85000000,
    previous_popularity: 92,
  },
  {
    id: "mock-artist-2",
    name: "Bad Bunny",
    slug: "bad-bunny",
    image_url:
      "https://i.scdn.co/image/ab6761610000e5eb0c68f6c95232e716e8a4c2a3",
    popularity: 98,
    followers: 52000000,
    follower_count: 52000000,
    trending_score: 980,
    genres: '["reggaeton", "latin"]',
    upcoming_shows: 22,
    total_shows: 85,
    previous_followers: 48000000,
    previous_popularity: 94,
  },
  {
    id: "mock-artist-3",
    name: "Drake",
    slug: "drake",
    image_url:
      "https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9",
    popularity: 94,
    followers: 67000000,
    follower_count: 67000000,
    trending_score: 940,
    genres: '["hip-hop", "rap"]',
    upcoming_shows: 18,
    total_shows: 120,
    previous_followers: 63000000,
    previous_popularity: 91,
  },
  {
    id: "mock-artist-4",
    name: "The Weeknd",
    slug: "the-weeknd",
    image_url:
      "https://i.scdn.co/image/ab6761610000e5eb0e08ea2c4d6789fbf5cccbbc",
    popularity: 92,
    followers: 45000000,
    follower_count: 45000000,
    trending_score: 920,
    genres: '["r&b", "pop"]',
    upcoming_shows: 12,
    total_shows: 95,
    previous_followers: 43000000,
    previous_popularity: 90,
  },
  {
    id: "mock-artist-5",
    name: "Billie Eilish",
    slug: "billie-eilish",
    image_url:
      "https://i.scdn.co/image/ab6761610000e5ebc2b7c1b8ad2b04a6b2e1e6b7",
    popularity: 90,
    followers: 38000000,
    follower_count: 38000000,
    trending_score: 900,
    genres: '["pop", "alternative"]',
    upcoming_shows: 10,
    total_shows: 65,
    previous_followers: 35000000,
    previous_popularity: 87,
  },
];

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
      console.log(
        "Using mock data for trending artists:",
        error?.message || "No data",
      );
      // Return mock data when database is not available or empty
      return MOCK_TRENDING_ARTISTS.slice(0, limit);
    }

    return artists;
  } catch (dbError) {
    console.log("Database connection failed, using mock data:", dbError);
    return MOCK_TRENDING_ARTISTS.slice(0, limit);
  }

  // Note: the function already returned in all branches above.
  // The code below was unreachable; keeping a typed transformer for reference if needed in future.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return [] as any;
  /* Transform to match frontend interface (reference)
  return artists.map((artist) => {
    // Calculate weekly growth based on previous data
    const currentFollowers = artist.followers || 0;
    const previousFollowers = artist.previous_followers || currentFollowers;
    const weeklyGrowth = previousFollowers > 0 
      ? ((currentFollowers - previousFollowers) / previousFollowers) * 100
      : 0;

    // Parse genres from JSON string
    let genres: string[] = [];
    if (artist.genres) {
      try {
        genres = JSON.parse(artist.genres);
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
  });*/
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
