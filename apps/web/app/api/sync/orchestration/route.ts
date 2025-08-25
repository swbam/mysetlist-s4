import { artists, db, eq } from "@repo/database";
import {
  ArtistSyncService,
  SetlistSyncService,
  ShowSyncService,
} from "@repo/external-apis";
import { spotify } from "@repo/external-apis";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

interface SyncRequest {
  spotifyId?: string;
  tmAttractionId?: string;
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
    const cronSecret = process.env['CRON_SECRET'];

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SyncRequest = await request.json();
    const {
      spotifyId: inputSpotifyId,
      tmAttractionId: inputTicketmasterId,
      mbid: inputMbid,
      artistName,
      options = {
        syncSongs: true,
        syncShows: true,
        createDefaultSetlists: true,
        fullDiscography: true,
      },
    } = body;

    // Validate input
    if (!inputSpotifyId && !inputTicketmasterId && !inputMbid && !artistName) {
      return NextResponse.json(
        {
          error:
            "Must provide at least one artist identifier (spotifyId, tmAttractionId, mbid, or artistName)",
        },
        { status: 400 },
      );
    }

    const steps: SyncStep[] = [
      {
        step: "0. Resolve identifiers (TM → Spotify → MBID)",
        status: "pending",
      },
      { step: "1. Sync artist core details from Spotify", status: "pending" },
      { step: "2. Sync FULL song catalog from Spotify", status: "pending" },
      { step: "3. Sync upcoming shows from Ticketmaster", status: "pending" },
      { step: "4. Create default predicted setlists", status: "pending" },
    ];

    let artistData: any = null;
    let spotifyId: string | null = inputSpotifyId || null;
    let tmAttractionId: string | null = inputTicketmasterId || null;
    let mbid: string | null = inputMbid || null;

    // Step 0: Resolve identifiers
    steps[0]!.status = "running";
    steps[0]!.startTime = new Date().toISOString();
    try {
      const artistSyncService = new ArtistSyncService();

      // If we only know TM or name, resolve the rest into DB and locals
      const idResult = await artistSyncService.syncIdentifiers({
        ...(artistName && { artistName }),
        ...(tmAttractionId && { ticketmasterAttractionId: tmAttractionId }),
      });

      spotifyId = spotifyId || idResult.spotifyId || null;
      tmAttractionId = tmAttractionId || idResult.tmAttractionId || null;
      mbid = mbid || idResult.mbid || null;

      steps[0]!.status = "completed";
      steps[0]!.endTime = new Date().toISOString();
      steps[0]!.result = { spotifyId, tmAttractionId, mbid };
    } catch (e: any) {
      steps[0]!.status = "failed";
      steps[0]!.endTime = new Date().toISOString();
      steps[0]!.error = e?.message || String(e);
      // Continue; later steps may still work if spotifyId provided
    }

    let artistId: string | null = null;

    // Step 1: Sync artist core details from Spotify
    if (steps[1]) {
      steps[1].status = "running";
      steps[1].startTime = new Date().toISOString();
    }

    try {
      const artistSyncService = new ArtistSyncService();

      // Find or resolve artist Spotify ID
      if (!spotifyId && artistName) {
        await spotify.authenticate();
        const searchResult = await spotify.searchArtists(artistName, 1);
        if (
          searchResult.artists.items.length > 0 &&
          searchResult.artists.items[0]
        ) {
          spotifyId = searchResult.artists.items[0].id;
        }
      }

      if (!spotifyId) {
        throw new Error("Could not resolve Spotify ID for artist");
      }

      // Sync basic artist data
      await artistSyncService.syncArtist(spotifyId);

      // Ensure DB has external IDs
      if (tmAttractionId || mbid) {
        const updates: any = {};
        if (tmAttractionId) updates.tmAttractionId = tmAttractionId;
        if (mbid) updates.mbid = mbid;
        await db
          .update(artists)
          .set(updates)
          .where(eq(artists.spotifyId, spotifyId));
      }

      // Get artist from database
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.spotifyId, spotifyId))
        .limit(1);

      if (!artist) {
        throw new Error("Artist not found in database after sync");
      }

      artistData = artist;
      artistId = artist.id;
      if (steps[1]) {
        steps[1].status = "completed";
        steps[1].endTime = new Date().toISOString();
        steps[1].result = { artistId: artist.id, name: artist.name };
      }
    } catch (error) {
      if (steps[1]) {
        steps[1].status = "failed";
        steps[1].endTime = new Date().toISOString();
        steps[1].error =
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

    // Step 2: Sync FULL song catalog from Spotify (non-live)
    if (options.syncSongs && spotifyId) {
      if (steps[2]) {
        steps[2].status = "running";
        steps[2].startTime = new Date().toISOString();
      }

      try {
        const artistSyncService = new ArtistSyncService();
        const songsResult =
          await artistSyncService.syncFullDiscography(spotifyId);

        if (steps[2]) {
          steps[2].status = "completed";
          steps[2].endTime = new Date().toISOString();
          steps[2].result = songsResult;
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
        reason: "syncSongs disabled or no spotifyId",
      };
    }

    // Step 3: Sync upcoming shows from Ticketmaster
    if (options.syncShows && artistData && artistId) {
      if (steps[3]) {
        steps[3].status = "running";
        steps[3].startTime = new Date().toISOString();
      }

      try {
        const showSyncService = new ShowSyncService();
        const showsResult = await showSyncService.syncArtistShows(artistId);

        if (steps[3]) {
          steps[3].status = "completed";
          steps[3].endTime = new Date().toISOString();
          steps[3].result = showsResult;
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
        reason: "syncShows disabled or no artist data",
      };
    }

    // Step 4: Create default predicted setlists (5 random non-live)
    if (options.createDefaultSetlists && artistData && artistId) {
      if (steps[4]) {
        steps[4].status = "running";
        steps[4].startTime = new Date().toISOString();
      }

      try {
        const setlistSyncService = new SetlistSyncService();
        const setlistResult =
          await setlistSyncService.createDefaultSetlists(artistId);

        if (steps[4]) {
          steps[4].status = "completed";
          steps[4].endTime = new Date().toISOString();
          steps[4].result = setlistResult;
        }
      } catch (error) {
        if (steps[4]) {
          steps[4].status = "failed";
          steps[4].endTime = new Date().toISOString();
          steps[4].error =
            error instanceof Error ? error.message : "Unknown error";
        }
      }
    } else if (steps[4]) {
      steps[4].status = "completed";
      steps[4].result = {
        skipped: true,
        reason: "createDefaultSetlists disabled or no artist data",
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
