import { type NextRequest, NextResponse } from "next/server";
import { db } from "@repo/database";
import { artists } from "@repo/database";
import { eq } from "drizzle-orm";
// import { UnifiedSyncService } from "../unified-pipeline/sync-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketmasterId, name, imageUrl } = body;

    if (!ticketmasterId || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check if artist already exists
    const existingArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.ticketmasterId, ticketmasterId))
      .limit(1);

    let artistId: string;

    if (existingArtist.length > 0 && existingArtist[0]) {
      artistId = existingArtist[0].id;
    } else {
      // Create new artist
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      const [newArtist] = await db
        .insert(artists)
        .values({
          ticketmasterId,
          name,
          slug,
          imageUrl,
          verified: true,
          lastSyncedAt: new Date(),
        })
        .returning();

      if (!newArtist) {
        return NextResponse.json(
          { error: "Failed to create artist" },
          { status: 500 },
        );
      }

      artistId = newArtist.id;
    }

    // Trigger full sync in the background via API
    // Don't await - let it run in the background
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/api/sync/artist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistId }),
    }).catch((error) => {
      console.error("Background sync error:", error);
    });

    return NextResponse.json({
      success: true,
      artistId,
      slug:
        existingArtist[0]?.slug ||
        name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      message: "Artist import initiated",
    });
  } catch (error) {
    console.error("Artist import error:", error);
    return NextResponse.json(
      {
        error: "Failed to import artist",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
