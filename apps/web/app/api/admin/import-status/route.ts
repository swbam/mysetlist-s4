import { NextRequest, NextResponse } from "next/server";
import { db, importStatus, artists, eq, desc, or } from "@repo/database";
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
    // First, try to find the artist by internal ID or ticketmaster ID
    let possibleArtistIds = [artistId]; // Start with the provided ID
    
    // If it's a UUID (internal ID), look up the ticketmaster ID
    if (artistId.length === 36 && artistId.includes('-')) {
      try {
        const artist = await db
          .select({ tmAttractionId: artists.tmAttractionId })
          .from(artists)
          .where(eq(artists.id, artistId))
          .limit(1);
        
        if (artist[0]?.tmAttractionId) {
          possibleArtistIds.push(artist[0].tmAttractionId);
        }
      } catch (error) {
        console.warn('Failed to lookup ticketmaster ID for artist:', artistId);
      }
    }
    
    // Add temp ID pattern
    possibleArtistIds.push(`tmp_${artistId}`);
    
    // Query with all possible IDs
    const statuses = await db
      .select()
      .from(importStatus)
      .where(
        or(
          ...possibleArtistIds.map(id => eq(importStatus.artistId, id))
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