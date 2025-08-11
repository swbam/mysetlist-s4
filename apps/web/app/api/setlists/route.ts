import { getUser } from "@repo/auth/server";
import { db } from "@repo/database";
import { setlists } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "~/lib/supabase/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

// GET method for fetching setlists
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const artistId = searchParams.get("artistId");
    const showId = searchParams.get("showId");

    const supabase = createServiceClient();
    
    let query = supabase
      .from("setlists")
      .select(`
        id,
        name,
        show_id,
        artist_id,
        created_at,
        updated_at,
        vote_count,
        total_votes,
        type,
        is_locked,
        accuracy_score,
        order_index
      `);

    // Apply filters using correct column names from schema
    if (artistId) {
      query = query.eq("artist_id", artistId);
    }
    
    if (showId) {
      query = query.eq("show_id", showId);
    }

    // Add pagination and ordering
    const offset = (page - 1) * limit;
    query = query
      .order("vote_count", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: setlistData, error } = await query;

    if (error) {
      console.error("Error fetching setlists:", error);
      throw error;
    }

    return NextResponse.json({
      setlists: setlistData || [],
      total: setlistData?.length || 0,
      page,
      limit,
      generatedAt: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Setlists API error:", error);
    return NextResponse.json({
      setlists: [],
      total: 0,
      page: 1,
      limit: 20,
      generatedAt: new Date().toISOString(),
      fallback: true,
      error: "Unable to load setlists at this time",
    }, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { showId, artistId, type, name } = await request.json();

    if (!showId || !artistId || !type || !name) {
      return NextResponse.json(
        { error: "Missing required fields: showId, artistId, type, name" },
        { status: 400 },
      );
    }

    if (!["predicted", "actual"].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "predicted" or "actual"' },
        { status: 400 },
      );
    }

    // Create the setlist
    const newSetlist = await db
      .insert(setlists)
      .values({
        showId,
        artistId,
        type,
        name,
        orderIndex: 0,
        isLocked: false,
        totalVotes: 0,
        accuracyScore: 0,
        createdBy: user.id,
      })
      .returning();

    return NextResponse.json(newSetlist[0]);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to create setlist" },
      { status: 500 },
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
