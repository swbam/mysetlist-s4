import { NextResponse } from "next/server";
import { initiateImport } from "@repo/external-apis";
import { queueManager, Priority } from "~/lib/queues/queue-manager";
import { ImportStatusManager } from "~/lib/import-status";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let jobId: string | undefined;
  let result: any;
  
  try {
    const { tmAttractionId } = await req.json();
    if (!tmAttractionId) {
      return NextResponse.json(
        { error: "tmAttractionId required" },
        { status: 400 },
      );
    }

    console.log(`🚀 Starting import for ${tmAttractionId}`);
    
    // Generate unique job ID for SSE tracking
    jobId = crypto.randomUUID();
    
    // Get basic artist info first
    result = await initiateImport(tmAttractionId);
    
    // Create import session in status manager
    await ImportStatusManager.createImportSession(result.artistId, jobId);
    
    // Add import job to queue for background processing
    const job = await queueManager.addArtistImportJob({
      tmAttractionId,
      artistId: result.artistId,
      priority: Priority.CRITICAL, // User-initiated imports are high priority
      adminImport: false,
    }, {
      jobId, // Use our generated job ID
    });
    
    console.log(`✅ Artist created: ${result.artistId} (${result.slug}) - Job queued: ${job.id}`);
    
    return NextResponse.json({
      jobId: job.id,
      artistId: result.artistId,
      slug: result.slug,
      success: true,
      message: "Import queued - track progress via SSE",
      progressUrl: `/api/artists/import/progress/${job.id}`
    });
    
  } catch (error) {
    console.error("Artist import failed:", error);
    
    // If we have a job ID and artist ID, mark import as failed
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Try to mark import as failed if we got far enough to create initial status
    try {
      if (error instanceof Error && error.message.includes("Job creation failed") && result?.artistId) {
        await ImportStatusManager.markImportFailed(result.artistId, errorMessage, jobId);
      }
    } catch (statusError) {
      console.error("Failed to update import status on error:", statusError);
    }
    
    return NextResponse.json(
      { 
        error: "Import failed",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
