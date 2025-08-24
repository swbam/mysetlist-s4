import { artists, db } from "@repo/database";
import { ArtistImportOrchestrator } from "@repo/external-apis";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { CACHE_TAGS } from "~/lib/cache";
import { updateImportStatus } from "~/lib/import-status";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let tempArtistId: string | null = null;
  let artistId: string | null = null;
  let retryCount = 0;
  const maxRetries = 2;

  try {
    const body = await request.json();
    const { tmAttractionId, spotifyId, artistName, retryOnFailure = true } = body;

    // Require at least one identifier
    if (!tmAttractionId && !spotifyId && !artistName) {
      return NextResponse.json(
        { error: "tmAttractionId, spotifyId, or artistName is required" },
        { status: 400 },
      );
    }

    // Create a temporary artist ID for status tracking
    const importKey = tmAttractionId || spotifyId || artistName;
    tempArtistId = `tmp_${importKey}`;

    // Initialize import status tracking
    await updateImportStatus(tempArtistId, {
      stage: "initializing",
      progress: 0,
      message: "Checking if artist already exists...",
    });

    // Check if artist already exists (idempotency)
    let existingArtist: any[] = [];

    if (tmAttractionId) {
      existingArtist = await db
        .select()
        .from(artists)
        .where(eq(artists.tmAttractionId, tmAttractionId))
        .limit(1);
    } else if (spotifyId) {
      existingArtist = await db
        .select()
        .from(artists)
        .where(eq(artists.spotifyId, spotifyId))
        .limit(1);
    }

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
          completed_at: new Date(),
        });
      }

      return NextResponse.json(
        {
          success: true,
          artistId,
          slug: (existingArtist[0] as any).slug,
          alreadyExists: true,
          message: "Artist already exists in database",
          statusEndpoint: `/api/sync/status?artistId=${artistId}`,
          importProgressEndpoint: `/api/artists/${artistId}/import-progress`,
        },
        { status: 200 },
      );
    }

    // Auto-import logic with retry mechanism
    let importResult: any;
    let lastError: Error | null = null;

    // Retry loop for resilient import
    while (retryCount <= maxRetries) {
      try {
        await updateImportStatus(tempArtistId, {
          stage: "initializing",
          progress: 10,
          message: `Attempting import... (try ${retryCount + 1}/${maxRetries + 1})`,
        });

        if (tmAttractionId) {
          // Direct Ticketmaster import using ArtistImportOrchestrator
          console.log(
            `[AUTO-IMPORT] Starting direct import for tmAttractionId: ${tmAttractionId} (attempt ${retryCount + 1})`,
          );

          // Create orchestrator with enhanced progress callback
          const orchestrator = new ArtistImportOrchestrator(async (progress) => {
            const targetArtistId = artistId || tempArtistId;
            if (targetArtistId) {
              const statusUpdate: any = {
                stage: progress.stage,
                progress: progress.progress,
                message: `${progress.message} (attempt ${retryCount + 1})`,
                error: progress.error || '',
              };
              
              if (progress.completedAt) {
                statusUpdate.completed_at = new Date(progress.completedAt);
              }
              
              await updateImportStatus(targetArtistId, statusUpdate);
            }
          });

          importResult = await orchestrator.importArtist(tmAttractionId);

          if (!importResult.success) {
            throw new Error(
              `Direct import failed: ${importResult.error || "Unknown orchestrator error"}`,
            );
          }

          artistId = importResult.artistId;
        } else {
          // Fallback to orchestration endpoint for Spotify ID or name-based imports
          console.log(
            `[AUTO-IMPORT] Using orchestration endpoint for: ${spotifyId || artistName} (attempt ${retryCount + 1})`,
          );

          const orchestrationResponse = await fetch(
            `${request.nextUrl.origin}/api/sync/orchestration`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env['CRON_SECRET'] || process.env['SUPABASE_SERVICE_ROLE_KEY']}`,
                "User-Agent": "TheSet-AutoImport/1.0",
              },
              body: JSON.stringify({
                spotifyId: spotifyId,
                artistName: artistName,
                options: {
                  syncSongs: true,
                  syncShows: true,
                  createDefaultSetlists: true,
                  fullDiscography: false, // Keep it lighter for auto-import
                },
              }),
              signal: AbortSignal.timeout(120000), // 2 minute timeout
            },
          );

          if (!orchestrationResponse.ok) {
            const errorText = await orchestrationResponse.text();
            throw new Error(
              `Orchestration auto-import failed: ${orchestrationResponse.status} ${errorText}`,
            );
          }

          importResult = await orchestrationResponse.json();
          
          // Check if orchestration was successful
          if (!importResult.success) {
            throw new Error(
              `Orchestration reported failure: ${importResult.error || "Unknown error"}`,
            );
          }

          artistId = importResult.artist?.id || importResult.artistId;
        }

        // If we get here, import was successful
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount++;

        console.error(`[AUTO-IMPORT] Attempt ${retryCount} failed:`, lastError.message);

        if (retryCount <= maxRetries && retryOnFailure) {
          // Update status to show retry
          await updateImportStatus(tempArtistId, {
            stage: "initializing",
            progress: 5,
            message: `Import attempt ${retryCount} failed, retrying... (${lastError.message})`,
            error: lastError.message,
          });

          // Exponential backoff: wait 2^retryCount seconds
          const waitTime = Math.pow(2, retryCount) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else {
          // All retries exhausted or retry disabled
          throw lastError;
        }
      }
    }

    // Revalidate cache
    revalidateTag(CACHE_TAGS.artists);

    return NextResponse.json(
      {
        success: true,
        artistId: importResult.artistId || artistId,
        slug: importResult.slug,
        importStarted: true,
        message: "Artist import completed successfully",
        statusEndpoint: `/api/sync/status?artistId=${importResult.artistId || artistId}`,
        importProgressEndpoint: `/api/artists/${importResult.artistId || artistId}/import-progress`,
        totalSongs: importResult.totalSongs || 0,
        totalShows: importResult.totalShows || 0,
        totalVenues: importResult.totalVenues || 0,
        importDuration: importResult.importDuration,
        retriesUsed: retryCount,
      },
      { status: 201 },
    );
  } catch (error) {
    // Enhanced error handling with status update
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[AUTO-IMPORT] Auto-import API error:", error);

    const targetArtistId = artistId || tempArtistId;
    if (targetArtistId) {
      try {
        await updateImportStatus(targetArtistId, {
          stage: "failed",
          progress: 0,
          message: `Auto-import failed after ${retryCount} attempts`,
          error: errorMessage,
          completed_at: new Date(),
        });
      } catch (statusError) {
        console.error(
          "[AUTO-IMPORT] Failed to update error status:",
          statusError,
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Auto-import failed",
        details:
          process.env['NODE_ENV'] === "development" ? errorMessage : undefined,
        statusEndpoint: targetArtistId
          ? `/api/sync/status?artistId=${targetArtistId}`
          : undefined,
        retriesUsed: retryCount,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tmAttractionId = searchParams.get("tmAttractionId");
  const spotifyId = searchParams.get("spotifyId");

  if (!tmAttractionId && !spotifyId) {
    return NextResponse.json(
      { error: "tmAttractionId or spotifyId is required" },
      { status: 400 },
    );
  }

  try {
    // Check if artist exists
    let existingArtist: any[] = [];

    if (tmAttractionId) {
      existingArtist = await db
        .select()
        .from(artists)
        .where(eq(artists.tmAttractionId, tmAttractionId))
        .limit(1);
    } else if (spotifyId) {
      existingArtist = await db
        .select()
        .from(artists)
        .where(eq(artists.spotifyId, spotifyId))
        .limit(1);
    }

    if (
      Array.isArray(existingArtist) &&
      existingArtist.length > 0 &&
      existingArtist[0]
    ) {
      return NextResponse.json({
        exists: true,
        artistId: (existingArtist[0] as any).id,
        slug: (existingArtist[0] as any).slug,
        statusEndpoint: `/api/sync/status?artistId=${(existingArtist[0] as any).id}`,
      });
    }

    return NextResponse.json({
      exists: false,
      canAutoImport: Boolean(tmAttractionId || spotifyId),
    });
  } catch (error) {
    console.error("Auto-import check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}