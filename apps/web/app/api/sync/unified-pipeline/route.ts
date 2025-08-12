import {
  artistSongs,
  artists,
  db,
  eq,
  setlistSongs,
  setlists,
  shows,
  songs,
  sql,
} from "@repo/database";
import {
  ArtistSyncService,
  SetlistSyncService,
  ShowSyncService,
  spotify,
} from "@repo/external-apis";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

interface SyncRequest {
  spotifyId?: string;
  ticketmasterId?: string;
  mbid?: string;
  artistName?: string;
  options?: {
    syncSongs?: boolean;
    syncShows?: boolean;
    createDefaultSetlists?: boolean;
    fullDiscography?: boolean;
  };
}

interface SyncStep {
  step: string;
  status: "pending" | "running" | "completed" | "failed";
  startTime?: string;
  endTime?: string;
  error?: string;
  result?: any;
}

export async function POST(request: NextRequest) {
  try {
    // Check for authorization
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SyncRequest = await request.json();
    const {
      spotifyId,
      ticketmasterId,
      mbid,
      artistName,
      options = {
        syncSongs: true,
        syncShows: true,
        createDefaultSetlists: true,
        fullDiscography: true,
      },
    } = body;

    // Validate input
    if (!spotifyId && !ticketmasterId && !mbid && !artistName) {
      return NextResponse.json(
        {
          error:
            "Must provide at least one artist identifier (spotifyId, ticketmasterId, mbid, or artistName)",
        },
        { status: 400 },
      );
    }

    const steps: SyncStep[] = [
      { step: "1. Sync artist core details from Spotify", status: "pending" },
      { step: "2. Sync FULL song catalog from Spotify", status: "pending" },
      { step: "3. Sync upcoming shows from Ticketmaster", status: "pending" },
      { step: "4. Create default predicted setlists", status: "pending" },
    ];

    let artistData: any = null;
    let artistId: string | null = null;

    // Step 1: Sync artist core details from Spotify
    if (steps[0]) {
      steps[0].status = "running";
      steps[0].startTime = new Date().toISOString();
    }

    try {
      const artistSyncService = new ArtistSyncService();

      // Find or resolve artist Spotify ID
      let resolvedSpotifyId = spotifyId;
      if (!resolvedSpotifyId && artistName) {
        // Search for artist by name
        await spotify.authenticate();
        const searchResult = await spotify.searchArtists(artistName, 1);
        if (
          searchResult.artists.items.length > 0 &&
          searchResult.artists.items[0]
        ) {
          resolvedSpotifyId = searchResult.artists.items[0].id;
        }
      }

      if (!resolvedSpotifyId) {
        throw new Error("Could not resolve Spotify ID for artist");
      }

      // Sync basic artist data
      await artistSyncService.syncArtist(resolvedSpotifyId);

      // Get artist from database
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.spotifyId, resolvedSpotifyId))
        .limit(1);

      if (!artist) {
        throw new Error("Artist not found in database after sync");
      }

      artistData = artist;
      artistId = artist.id;
      if (steps[0]) {
        steps[0].status = "completed";
        steps[0].endTime = new Date().toISOString();
        steps[0].result = { artistId: artist.id, name: artist.name };
      }
    } catch (error) {
      if (steps[0]) {
        steps[0].status = "failed";
        steps[0].endTime = new Date().toISOString();
        steps[0].error =
          error instanceof Error ? error.message : "Unknown error";
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to sync artist core details",
          steps,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }

    // Step 2: Sync FULL song catalog from Spotify
    if (options.syncSongs && artistData?.spotifyId) {
      if (steps[1]) {
        steps[1].status = "running";
        steps[1].startTime = new Date().toISOString();
      }

      try {
        const artistSyncService = new ArtistSyncService();
        const songsResult = await artistSyncService.syncFullDiscography(artistData.spotifyId);

        if (steps[1]) {
          steps[1].status = "completed";
          steps[1].endTime = new Date().toISOString();
          steps[1].result = songsResult;
        }
      } catch (error) {
        if (steps[1]) {
          steps[1].status = "failed";
          steps[1].endTime = new Date().toISOString();
          steps[1].error =
            error instanceof Error ? error.message : "Unknown error";
        }
      }
    } else if (steps[1]) {
      steps[1].status = "completed";
      steps[1].result = {
        skipped: true,
        reason: "syncSongs disabled or no artistData.spotifyId",
      };
    }

    // Step 3: Sync upcoming shows from Ticketmaster
    if (options.syncShows && artistId) {
      if (steps[2]) {
        steps[2].status = "running";
        steps[2].startTime = new Date().toISOString();
      }

      try {
        const showSyncService = new ShowSyncService();
        const showResult = await showSyncService.syncArtistShows(artistId);
        if (steps[2]) {
          steps[2].status = "completed";
          steps[2].endTime = new Date().toISOString();
          steps[2].result = showResult;
        }
      } catch (error) {
        if (steps[2]) {
          steps[2].status = "failed";
          steps[2].endTime = new Date().toISOString();
          steps[2].error =
            error instanceof Error ? error.message : "Unknown error";
        }
      }
    } else if (steps[2]) {
      steps[2].status = "completed";
      steps[2].result = {
        skipped: true,
        reason: "syncShows disabled or no artistId",
      };
    }

    // Step 4: Create default predicted setlists
    if (options.createDefaultSetlists && artistId) {
      if (steps[3]) {
        steps[3].status = "running";
        steps[3].startTime = new Date().toISOString();
      }

      try {
        const setlistSyncService = new SetlistSyncService();
        const setlistResult = await setlistSyncService.createDefaultSetlists(artistId);
        if (steps[3]) {
          steps[3].status = "completed";
          steps[3].endTime = new Date().toISOString();
          steps[3].result = setlistResult;
        }
      } catch (error) {
        if (steps[3]) {
          steps[3].status = "failed";
          steps[3].endTime = new Date().toISOString();
          steps[3].error =
            error instanceof Error ? error.message : "Unknown error";
        }
      }
    } else if (steps[3]) {
      steps[3].status = "completed";
      steps[3].result = {
        skipped: true,
        reason: "createDefaultSetlists disabled or no artistId",
      };
    }

    const completedSteps = steps.filter((s) => s.status === "completed").length;
    const failedSteps = steps.filter((s) => s.status === "failed").length;

    return NextResponse.json({
      success: failedSteps === 0,
      artist: artistData,
      summary: {
        totalSteps: steps.length,
        completed: completedSteps,
        failed: failedSteps,
        successRate: `${Math.round((completedSteps / steps.length) * 100)}%`,
      },
      steps,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Orchestration sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Orchestration sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// GET method to check sync capabilities
export async function GET() {
  return NextResponse.json({
    name: "Unified Artist Sync Pipeline",
    version: "2.0",
    capabilities: [
      "Artist core data sync from Spotify",
      "Full discography sync with album metadata",
      "Show sync from Ticketmaster",
      "Default setlist generation",
      "Bulk artist processing",
    ],
    modes: ["single", "bulk"],
    options: {
      syncSongs: "boolean - Sync full song catalog (default: true)",
      syncShows: "boolean - Sync upcoming shows (default: true)",
      createDefaultSetlists: "boolean - Create predicted setlists (default: true)",
      fullDiscography: "boolean - Sync full discography vs top tracks only (default: true)",
    },
  });
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-csrf-token",
      "Access-Control-Max-Age": "86400",
    },
  });
}