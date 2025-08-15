import { NextRequest, NextResponse } from "next/server";
import { db, importLogs, artists, eq, desc, and, or } from "@repo/database";
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
    const artistName = searchParams.get("artistName");
    const level = searchParams.get("level");
    const stage = searchParams.get("stage");
    const limit = parseInt(searchParams.get("limit") || "1000");

    // Build query conditions
    const conditions: any[] = [];
    
    if (artistId) {
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
      
      // Build condition to match any of the possible IDs
      const orConditions = possibleArtistIds.map(id => eq(importLogs.artistId, id));
      if (orConditions.length > 0) {
        const orCondition = orConditions.length === 1 
          ? orConditions[0] 
          : or(...orConditions);
        if (orCondition) {
          conditions.push(orCondition);
        }
      }
    }
    
    if (artistName) {
      conditions.push(like(importLogs.artistName, `%${artistName}%`));
    }
    
    if (level) {
      conditions.push(eq(importLogs.level, level as any));
    }
    
    if (stage) {
      conditions.push(eq(importLogs.stage, stage));
    }

    // Query logs
    const query = db
      .select()
      .from(importLogs)
      .orderBy(desc(importLogs.createdAt))
      .limit(limit);

    // Apply conditions if any
    const logs = conditions.length > 0 
      ? await query.where(and(...conditions))
      : await query;

    return NextResponse.json({ 
      logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("Failed to fetch import logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch import logs" },
      { status: 500 }
    );
  }
}