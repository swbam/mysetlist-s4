import { type NextRequest, NextResponse } from "next/server";
import { queueManager, QueueName, Priority } from "~/lib/queues/queue-manager";
import { ArtistImportOrchestrator } from "~/lib/services/artist-import-orchestrator";
import { db, artists, eq } from "@repo/database";

/**
 * POST /api/artists/import - Smart artist import endpoint
 * Phase 1: Executes immediately (< 3s) and returns artist slug for navigation
 * Phase 2-3: Queued as background jobs for shows/venues/songs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tmAttractionId, userId, adminImport } = body;

    if (!tmAttractionId) {
      return NextResponse.json(
        { error: "tmAttractionId is required" },
        { status: 400 }
      );
    }

    // Check if artist already exists with this TM ID
    const existingArtist = await db
      .select({ id: artists.id, slug: artists.slug, name: artists.name })
      .from(artists)
      .where(eq(artists.tmAttractionId, tmAttractionId))
      .limit(1);

    if (existingArtist.length > 0 && existingArtist[0]) {
      // Artist already exists, queue background sync and return immediately
      const jobId = `sync_${tmAttractionId}_${Date.now()}`;
      
      // Queue background sync to update shows/songs
      await queueManager.addJob(
        QueueName.ARTIST_IMPORT,
        `artist-sync-${tmAttractionId}`,
        {
          tmAttractionId,
          artistId: existingArtist[0].id,
          userId,
          adminImport: adminImport || false,
          syncOnly: true,
          priority: Priority.HIGH,
        },
        {
          jobId,
          priority: Priority.HIGH,
        }
      );

      return NextResponse.json({
        success: true,
        artistId: existingArtist[0].id,
        slug: existingArtist[0].slug,
        name: existingArtist[0].name,
        jobId,
        isExisting: true,
        message: "Artist found, syncing latest data",
      });
    }

    // PHASE 1: Execute immediately for instant page load (< 3s)
    const orchestrator = new ArtistImportOrchestrator();
    const artistData = await orchestrator.processPhase1(tmAttractionId);

    // Generate job ID for tracking background phases
    const jobId = `import_${tmAttractionId}_${Date.now()}`;
    
    // Queue Phase 2 & 3 as background jobs with CRITICAL priority
    const backgroundJob = await queueManager.addJob(
      QueueName.ARTIST_IMPORT,
      `artist-import-phases-${tmAttractionId}`,
      {
        tmAttractionId,
        artistId: artistData.artistId,
        userId,
        adminImport: adminImport || false,
        phase1Complete: true,
        priority: Priority.CRITICAL,
      },
      {
        jobId,
        priority: Priority.CRITICAL,
        removeOnComplete: {
          age: 3600, // Keep for 1 hour
          count: 100,
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      }
    );

    // Return immediately with artist data for instant navigation
    return NextResponse.json({
      success: true,
      artistId: artistData.artistId,
      slug: artistData.slug,
      name: artistData.name,
      imageUrl: artistData.imageUrl,
      jobId: backgroundJob.id,
      isExisting: false,
      message: "Artist created, importing data in background",
    });

  } catch (error) {
    console.error("[IMPORT] Failed to import artist:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to import artist",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

