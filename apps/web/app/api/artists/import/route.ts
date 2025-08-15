import { artists, db } from "@repo/database";
import { ArtistImportOrchestrator } from "~/lib/services/artist-import-orchestrator";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { CACHE_TAGS } from "~/lib/cache";
import { updateImportStatus } from "~/lib/import-status";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tmAttractionId } = body;

    if (!tmAttractionId) {
      return NextResponse.json(
        { error: "tmAttractionId is required" },
        { status: 400 },
      );
    }

    // Generate unique job ID for tracking
    const jobId = `import_${tmAttractionId}_${Date.now()}`;

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
      const artist = existingArtist[0] as any;
      
      // Update status for existing artist
      await updateImportStatus(jobId, {
        stage: "completed",
        progress: 100,
        message: "Artist already exists in database",
        artistId: artist.id,
        slug: artist.slug,
        completedAt: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: true,
          jobId,
          artistId: artist.id,
          slug: artist.slug,
          alreadyExists: true,
          message: "Artist already exists",
        },
        { status: 200 },
      );
    }

    // Initialize import status tracking
    await updateImportStatus(jobId, {
      stage: "initializing",
      progress: 0,
      message: "Starting artist import...",
    });

    // Create orchestrator with real-time progress tracking
    const orchestrator = new ArtistImportOrchestrator(async (progress) => {
      await updateImportStatus(jobId, {
        stage: progress.stage,
        progress: progress.progress,
        message: progress.message,
        error: progress.error,
        artistId: progress.artistId,
        totalSongs: progress.totalSongs,
        totalShows: progress.totalShows,
        totalVenues: progress.totalVenues,
        completedAt: progress.completedAt,
      });
    });

    console.log(
      `[IMPORT] Starting orchestrator import for tmAttractionId: ${tmAttractionId} with jobId: ${jobId}`,
    );

    // Execute Phase 1: Fast artist creation and immediate response (< 3 seconds)
    const importResult = await orchestrator.importArtist(tmAttractionId, body.adminImport || false);

    if (!importResult.success) {
      throw new Error("Import failed in orchestrator");
    }

    const artistId = importResult.artistId;

    // Revalidate cache
    revalidateTag(CACHE_TAGS.artists);

    // Return immediately with job ID for progress tracking
    return NextResponse.json(
      {
        success: true,
        jobId,
        message: "Import started successfully. Use the jobId to track progress.",
      },
      { status: 202 }, // 202 Accepted - processing started
    );
  } catch (error) {
    console.error("[IMPORT] Import API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}

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
