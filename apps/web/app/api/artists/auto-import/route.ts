import { artists, db } from "@repo/database";
import { ArtistImportOrchestrator } from "@repo/external-apis";
import { eq, or } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { CACHE_TAGS } from "~/lib/cache";
import { updateImportStatus, getImportStatus } from "~/lib/import-status";

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

    // Enhanced idempotency checks (check by multiple identifiers)
    let existingArtist: any[] = [];

    // Check by Ticketmaster ID first
    if (tmAttractionId) {
      existingArtist = await db
        .select()
        .from(artists)
        .where(eq(artists.tmAttractionId, tmAttractionId))
        .limit(1);
    }
    
    // If not found by TM ID, check by Spotify ID
    if (existingArtist.length === 0 && spotifyId) {
      existingArtist = await db
        .select()
        .from(artists)
        .where(eq(artists.spotifyId, spotifyId))
        .limit(1);
    }
    
    // If not found by IDs, check by name (fuzzy match)
    if (existingArtist.length === 0 && artistName) {
      existingArtist = await db
        .select()
        .from(artists)
        .where(eq(artists.name, artistName))
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
          completedAt: new Date().toISOString(),
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

    // Check for ongoing imports to prevent concurrent imports
    const ongoingImportKey = tmAttractionId || spotifyId || artistName;
    const ongoingImportStatus = await getImportStatus(`tmp_${ongoingImportKey}`);
    
    if (ongoingImportStatus && ongoingImportStatus.stage !== "completed" && ongoingImportStatus.stage !== "failed") {
      console.log(`[AUTO-IMPORT] Import already in progress for: ${ongoingImportKey}`);
      
      return NextResponse.json(
        {
          success: true,
          message: "Import already in progress",
          statusEndpoint: `/api/sync/status?artistId=tmp_${ongoingImportKey}`,
          importProgressEndpoint: `/api/artists/import/progress/tmp_${ongoingImportKey}`,
          alreadyInProgress: true,
        },
        { status: 200 },
      );
    }

    // Auto-import logic: Try tmAttractionId first, then fallback to orchestration endpoint
    let importResult: any;

    if (tmAttractionId) {
      // Direct Ticketmaster import using ArtistImportOrchestrator
      console.log(
        `[AUTO-IMPORT] Starting direct import for tmAttractionId: ${tmAttractionId}`,
      );

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

      importResult = await orchestrator.importArtist(tmAttractionId);

      if (!importResult.success) {
        throw new Error("Direct import failed in orchestrator");
      }

      artistId = importResult.artistId;
    } else {
      // Fallback to orchestration endpoint for Spotify ID or name-based imports
      console.log(
        `[AUTO-IMPORT] Using orchestration endpoint for: ${spotifyId || artistName}`,
      );

      // Use proper URL construction for production
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL
        ? process.env.NEXT_PUBLIC_APP_URL
        : request.nextUrl.origin;
        
      const orchestrationResponse = await fetch(
        `${baseUrl}/api/sync/orchestration`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Add authorization for internal API calls
            ...(process.env.CRON_SECRET && {
              "Authorization": `Bearer ${process.env.CRON_SECRET}`
            }),
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
        },
      );

      if (!orchestrationResponse.ok) {
        const errorText = await orchestrationResponse.text();
        throw new Error(
          `Orchestration auto-import failed: ${orchestrationResponse.status} ${errorText}`,
        );
      }

      importResult = await orchestrationResponse.json();
      artistId = importResult.artistId;
    }

    // Revalidate cache
    revalidateTag(CACHE_TAGS.artists);

    return NextResponse.json(
      {
        success: true,
        artistId: importResult.artistId || artistId,
        slug: importResult.slug,
        importStarted: true,
        message: "Artist import started successfully",
        statusEndpoint: `/api/sync/status?artistId=${importResult.artistId || artistId}`,
        importProgressEndpoint: `/api/artists/${importResult.artistId || artistId}/import-progress`,
        totalSongs: importResult.totalSongs || 0,
        totalShows: importResult.totalShows || 0,
        totalVenues: importResult.totalVenues || 0,
        importDuration: importResult.importDuration,
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
          message: "Auto-import failed due to unexpected error",
          error: errorMessage,
          completedAt: new Date().toISOString(),
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
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
        statusEndpoint: targetArtistId
          ? `/api/sync/status?artistId=${targetArtistId}`
          : undefined,
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
