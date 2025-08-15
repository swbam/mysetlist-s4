import { artists, db } from "@repo/database";
import { eq } from "drizzle-orm";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: artistId } = await params;

    // Validate artistId parameter
    if (!artistId || typeof artistId !== "string") {
      return NextResponse.json(
        { error: "artistId parameter is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    });

    try {
      // Get artist by ID from database
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);

      if (!artist) {
        return NextResponse.json(
          { error: "Artist not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(artist, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
        },
      });
    } catch (error) {
      console.error(`Error fetching artist ${artistId}:`, error);
      
      return NextResponse.json(
        { error: "Failed to fetch artist" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Artist API error:", error);
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