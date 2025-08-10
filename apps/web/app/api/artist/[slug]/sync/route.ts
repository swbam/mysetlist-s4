import { db } from "@repo/database";
import { artists } from "@repo/database";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Trigger artist sync when user clicks/visits an artist page
 * This will be called from the frontend when an artist page is accessed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Artist slug required" },
        { status: 400 },
      );
    }

    // Find artist by slug
    const artist = await db
      .select()
      .from(artists)
      .where(eq(artists.slug, slug))
      .limit(1);

    if (!artist.length) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const artistData = artist[0];

    // Type guard to ensure artistData is defined
    if (!artistData) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    // Check if sync is needed (avoid over-syncing)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const needsSync =
      !artistData.lastSyncedAt ||
      new Date(artistData.lastSyncedAt) < oneHourAgo;

    if (!needsSync) {
      return NextResponse.json({
        success: true,
        message: "Artist data is current",
        artist: {
          id: artistData.id,
          name: artistData.name,
          slug: artistData.slug,
          lastSynced: artistData.lastSyncedAt,
        },
        synced: false,
      });
    }

    // Use the unified pipeline for comprehensive sync
    const syncUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

    // Fire and forget the sync - don't make user wait
    fetch(`${syncUrl}/api/sync/unified-pipeline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ArtistPageSync/1.0",
      },
      body: JSON.stringify({
        artistId: artistData.id,
        mode: "single",
        comprehensive: false, // Light sync for user-initiated
      }),
    }).catch(() => {
      // Silently handle errors to not block user experience
    });

    // Update last sync attempt timestamp to prevent duplicate calls
    await db
      .update(artists)
      .set({
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistData.id));

    return NextResponse.json({
      success: true,
      message: "Artist sync initiated",
      artist: {
        id: artistData.id,
        name: artistData.name,
        slug: artistData.slug,
        lastSynced: new Date(),
      },
      synced: true,
      note: "Sync running in background",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Artist sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET endpoint to check sync status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Artist slug required" },
        { status: 400 },
      );
    }

    // Find artist by slug
    const artist = await db
      .select()
      .from(artists)
      .where(eq(artists.slug, slug))
      .limit(1);

    if (!artist.length) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const artistData = artist[0];

    // Type guard to ensure artistData is defined
    if (!artistData) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      artist: {
        id: artistData.id,
        name: artistData.name,
        slug: artistData.slug,
        lastSynced: artistData.lastSyncedAt,
        needsSync:
          !artistData.lastSyncedAt ||
          new Date(artistData.lastSyncedAt) <
            new Date(Date.now() - 60 * 60 * 1000),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get artist sync status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
