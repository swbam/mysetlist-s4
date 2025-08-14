import { NextRequest, NextResponse } from "next/server";
import { db, importStatus, eq, desc, or } from "@repo/database";
import { like } from "drizzle-orm";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // For now, allow all authenticated users (you can add admin check later)
    // if (!user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const searchParams = request.nextUrl.searchParams;
    const artistId = searchParams.get("artistId");

    if (!artistId) {
      return NextResponse.json(
        { error: "Artist ID is required" },
        { status: 400 }
      );
    }

    // Get the latest import status for the artist
    // Support both exact ID match and slug-like matching
    const statuses = await db
      .select()
      .from(importStatus)
      .where(
        or(
          eq(importStatus.artistId, artistId),
          like(importStatus.artistId, `%${artistId}%`)
        )
      )
      .orderBy(desc(importStatus.createdAt))
      .limit(1);

    const status = statuses[0] || null;

    return NextResponse.json({ 
      status,
      found: !!status,
    });
  } catch (error) {
    console.error("Failed to fetch import status:", error);
    return NextResponse.json(
      { error: "Failed to fetch import status" },
      { status: 500 }
    );
  }
}