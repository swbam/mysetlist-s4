import { artists, db } from "@repo/database";
import { ArtistImportOrchestrator } from "@repo/external-apis";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { CACHE_TAGS } from "~/lib/cache";
import { updateImportStatus } from "~/lib/import-status";

export async function POST(request: NextRequest) {
  let tempArtistId: string | null = null;
  let artistId: string | null = null;

  try {
    const body = await request.json();
    const { tmAttractionId } = body;

    if (!tmAttractionId) {
      return NextResponse.json(
        { error: "tmAttractionId is required" },
        { status: 400 },
      );
    }

    // Create a temporary artist ID for status tracking before we have a real one
    tempArtistId = `tmp_${tmAttractionId}`;

    // Initialize import status tracking
    await updateImportStatus(tempArtistId, {
      stage: "initializing",
      progress: 0,
      message: "Checking if artist already exists...",
    });

    // Check if artist already exists by ticketmaster ID (idempotency)
    const existingArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.ticketmasterId, tmAttractionId))
      .limit(1);

    if (
      Array.isArray(existingArtist) &&
      existingArtist.length > 0 &&
      existingArtist[0]
    ) {
      artistId = (existingArtist[0] as any).id;

      // Update status for existing artist
      if (artistId) {
        await updateImportStatus(artistId, {
          stage: "completed",
          progress: 100,
          message: "Artist already exists in database",
          completedAt: new Date().toISOString(),
        });
      }

      return NextResponse.json(
        {
          artistId,
          slug: (existingArtist[0] as any).slug,
          alreadyExists: true,
          progressEndpoint: `/api/artists/${artistId}/import-progress`,
        },
        { status: 200 },
      );
    }

    // Create orchestrator with progress callback
    const orchestrator = new ArtistImportOrchestrator(async (progress) => {
      const targetArtistId = artistId || tempArtistId;
      if (targetArtistId) {
        await updateImportStatus(targetArtistId, {
          stage: progress.stage,
          progress: progress.progress,
          message: progress.message,
          error: progress.error,
          completedAt: progress.completedAt,
        });
      }
    });

    console.log(
      `[IMPORT] Starting orchestrator import for tmAttractionId: ${tmAttractionId}`,
    );

    // Execute Phase 1: Fast artist creation and immediate response (< 3 seconds)
    const importResult = await orchestrator.importArtist(tmAttractionId);

    if (!importResult.success) {
      throw new Error("Import failed in orchestrator");
    }

    artistId = importResult.artistId;

    // Revalidate cache
    revalidateTag(CACHE_TAGS.artists);

    return NextResponse.json(
      {
        artistId: importResult.artistId,
        slug: importResult.slug,
        importStarted: true,
        progressEndpoint: `/api/artists/${importResult.artistId}/import-progress`,
        totalSongs: importResult.totalSongs,
        totalShows: importResult.totalShows,
        totalVenues: importResult.totalVenues,
        importDuration: importResult.importDuration,
      },
      { status: 201 },
    );
  } catch (error) {
    // Enhanced error handling with status update
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[IMPORT] Import API error:", error);

    const targetArtistId = artistId || tempArtistId;
    if (targetArtistId) {
      try {
        await updateImportStatus(targetArtistId, {
          stage: "failed",
          progress: 0,
          message: "Import failed due to unexpected error",
          error: errorMessage,
          completedAt: new Date().toISOString(),
        });
      } catch (statusError) {
        console.error("[IMPORT] Failed to update error status:", statusError);
      }
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        progressEndpoint: targetArtistId
          ? `/api/artists/${targetArtistId}/import-progress`
          : undefined,
      },
      { status: 500 },
    );
  }
}

// Note: Background processing is now handled by the ArtistImportOrchestrator
// The orchestrator runs all phases including background tasks in a single coordinated flow

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tmAttractionId = searchParams.get("tmAttractionId");

  if (!tmAttractionId) {
    return NextResponse.json(
      { error: "tmAttractionId is required" },
      { status: 400 },
    );
  }

  try {
    // Check if artist exists
    const existingArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.ticketmasterId, tmAttractionId))
      .limit(1);

    if (
      Array.isArray(existingArtist) &&
      existingArtist.length > 0 &&
      existingArtist[0]
    ) {
      return NextResponse.json({
        exists: true,
        artistId: (existingArtist[0] as any).id,
        slug: (existingArtist[0] as any).slug,
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error("Import check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
