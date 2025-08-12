import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

interface SyncArtistRequest {
  ticketmasterId?: string;
  spotifyId?: string;
  artistName?: string;
  syncType?: "basic" | "full" | "shows_only";
}

export async function POST(request: NextRequest) {
  try {
    const body: SyncArtistRequest = await request.json();
    const { ticketmasterId, spotifyId, artistName, syncType = "basic" } = body;

    // Validate required fields
    if (!ticketmasterId && !spotifyId) {
      return NextResponse.json(
        { error: "Either ticketmasterId or spotifyId is required" },
        { status: 400 }
      );
    }

    console.log(`Background artist sync requested:`, {
      ticketmasterId,
      spotifyId,
      artistName,
      syncType,
    });

    // Return 202 Accepted immediately (non-blocking)
    const response = NextResponse.json(
      {
        message: "Artist sync initiated",
        status: "accepted",
        syncJobId: `sync_${Date.now()}_${ticketmasterId || spotifyId}`,
        estimatedDuration: "30-60 seconds",
        syncType,
      },
      { status: 202 }
    );

    // Trigger background sync in a non-blocking way
    // Using setImmediate to start the sync after responding
    setImmediate(async () => {
      try {
        await performBackgroundSync({
          ticketmasterId,
          spotifyId,
          artistName,
          syncType,
        });
      } catch (error) {
        console.error("Background sync failed:", error);
        // In a production app, you'd want to:
        // - Store the error in a job queue/database
        // - Send notifications about failed syncs
        // - Implement retry logic
      }
    });

    return response;
  } catch (error) {
    console.error("Artist sync API error:", error);
    return NextResponse.json(
      {
        error: "Failed to initiate artist sync",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function performBackgroundSync(params: SyncArtistRequest) {
  const { ticketmasterId, spotifyId, artistName, syncType } = params;
  
  console.log(`Starting background sync for artist: ${artistName || ticketmasterId || spotifyId}`);

  try {
    // Step 1: Fetch artist data from Ticketmaster if we have an ID
    if (ticketmasterId) {
      await syncArtistFromTicketmaster(ticketmasterId, artistName);
    }

    // Step 2: Enrich with Spotify data if we have a Spotify ID
    if (spotifyId) {
      await syncArtistFromSpotify(spotifyId);
    }

    // Step 3: Sync shows if requested
    if (syncType === "full" || syncType === "shows_only") {
      await syncArtistShows(ticketmasterId, artistName);
    }

    console.log(`Background sync completed for: ${artistName || ticketmasterId || spotifyId}`);
  } catch (error) {
    console.error(`Background sync failed for: ${artistName || ticketmasterId || spotifyId}`, error);
    throw error;
  }
}

async function syncArtistFromTicketmaster(ticketmasterId: string, artistName?: string) {
  try {
    // Import artist from Ticketmaster using existing import endpoint
    const importResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/api/artists/import`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketmasterId,
          artistName,
        }),
      }
    );

    if (!importResponse.ok) {
      const errorText = await importResponse.text();
      throw new Error(`Ticketmaster import failed: ${errorText}`);
    }

    const importData = await importResponse.json();
    console.log(`Artist imported from Ticketmaster: ${importData.artist?.name}`);
    return importData;
  } catch (error) {
    console.error("Ticketmaster sync failed:", error);
    throw error;
  }
}

async function syncArtistFromSpotify(spotifyId: string) {
  try {
    // TODO: Implement Spotify sync if needed
    // For now, this is a placeholder since the main requirement is Ticketmaster
    console.log(`Spotify sync placeholder for: ${spotifyId}`);
  } catch (error) {
    console.error("Spotify sync failed:", error);
    throw error;
  }
}

async function syncArtistShows(ticketmasterId?: string, artistName?: string) {
  try {
    if (!ticketmasterId && !artistName) {
      return;
    }

    // TODO: Implement show syncing
    // This would fetch upcoming shows from Ticketmaster and sync them to the database
    console.log(`Show sync placeholder for: ${artistName || ticketmasterId}`);
  } catch (error) {
    console.error("Show sync failed:", error);
    throw error;
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Artist sync API endpoint",
    description: "POST to this endpoint to trigger background artist sync",
    requiredFields: ["ticketmasterId OR spotifyId"],
    optionalFields: ["artistName", "syncType"],
    syncTypes: ["basic", "full", "shows_only"],
  });
}