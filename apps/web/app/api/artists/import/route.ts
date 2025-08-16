import { type NextRequest, NextResponse } from "next/server";
import { queueManager, QueueName, Priority } from "~/lib/queues/queue-manager";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/artists/import - Kickoff endpoint for artist imports using BullMQ
 * Returns immediately with job ID for tracking
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

    // Generate job ID for tracking
    const jobId = `import_${tmAttractionId}_${Date.now()}`;
    
    // Queue the import job with high priority for user-initiated imports
    const job = await queueManager.addJob(
      QueueName.ARTIST_IMPORT,
      `artist-import-${tmAttractionId}`,
      {
        tmAttractionId,
        userId,
        adminImport: adminImport || false,
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

    // Return job ID for progress tracking
    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        tmAttractionId,
        message: "Import queued successfully",
      },
      { status: 202 } // 202 Accepted - request accepted for processing
    );

  } catch (error) {
    console.error("[IMPORT] Failed to queue import:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to queue import",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

