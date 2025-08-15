import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { getArtistShows } from "~/app/artists/[slug]/actions";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: artistId } = await params;
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") as "upcoming" | "past") || "upcoming";

    // Validate artistId parameter
    if (!artistId || typeof artistId !== "string") {
      return NextResponse.json(
        { error: "artistId parameter is required" },
        { status: 400 }
      );
    }

    // Validate type parameter
    if (!["upcoming", "past"].includes(type)) {
      return NextResponse.json(
        { error: "type must be either 'upcoming' or 'past'" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    });

    try {
      // Use the existing server action to get artist shows
      const shows = await getArtistShows(artistId, type);

      return NextResponse.json(shows, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
        },
      });
    } catch (error) {
      console.error(`Error fetching ${type} shows for artist ${artistId}:`, error);
      
      // Return empty array instead of error to prevent UI crashes
      return NextResponse.json([], {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
        },
      });
    }
  } catch (error) {
    console.error("Artist shows API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
      },
      { status: 500 }
    );
  }
}

// Optional: Support HEAD requests for health checks
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: artistId } = await params;

  if (!artistId) {
    return new NextResponse(null, { status: 400 });
  }

  return new NextResponse(null, { status: 200 });
}