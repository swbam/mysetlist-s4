import { artistSongs, artists, db, eq, shows, songs } from "@repo/database";
import {
  ArtistSyncService,
  SetlistSyncService,
  ShowSyncService,
} from "@repo/external-apis";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

interface UnifiedSyncRequest {
  artistId?: string;
  artistIds?: string[];
  mode: "single" | "bulk";
  options?: {
    syncSongs?: boolean;
    syncShows?: boolean;
    createDefaultSetlists?: boolean;
    fullDiscography?: boolean;
  };
}

interface SyncResult {
  success: boolean;
  mode: string;
  timestamp: string;
  results: {
    artist: { updated: boolean; data: any };
    songs: { synced: number; errors: number };
    shows: { synced: number; errors: number };
    venues: { synced: number; errors: number };
    setlists: { synced: number; errors: number };
    stats: { calculated: boolean };
  };
}

async function syncSingleArtist(
  artistId: string,
  options: UnifiedSyncRequest["options"] = {},
): Promise<SyncResult> {
  const {
    syncSongs = true,
    syncShows = true,
    createDefaultSetlists = true,
    fullDiscography = true,
  } = options;

  const result: SyncResult = {
    success: false,
    mode: "single",
    timestamp: new Date().toISOString(),
    results: {
      artist: { updated: false, data: null },
      songs: { synced: 0, errors: 0 },
      shows: { synced: 0, errors: 0 },
      venues: { synced: 0, errors: 0 },
      setlists: { synced: 0, errors: 0 },
      stats: { calculated: false },
    },
  };

  try {
    // Get artist from database
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artist) {
      throw new Error(`Artist not found: ${artistId}`);
    }

    if (!artist.spotifyId) {
      throw new Error(`Artist ${artist.name} has no Spotify ID`);
    }

    console.log(`🎵 Starting unified sync for ${artist.name}...`);

    // Step 1: Sync artist core details
    const artistSyncService = new ArtistSyncService();
    try {
      await artistSyncService.syncArtist(artist.spotifyId);
      result.results.artist.updated = true;
      result.results.artist.data = artist;
      console.log(`✅ Artist core details synced for ${artist.name}`);
    } catch (error) {
      console.error(`❌ Artist sync failed for ${artist.name}:`, error);
      result.results.artist.updated = false;
    }

    // Step 2: Sync full song catalog
    if (syncSongs) {
      try {
        console.log(`🎵 Starting full discography sync for ${artist.name}...`);
        const songResult = await artistSyncService.syncFullDiscography(artist.spotifyId);
        result.results.songs.synced = songResult.totalSongs;
        console.log(
          `✅ Songs synced for ${artist.name}: ${songResult.totalSongs} songs, ${songResult.totalAlbums} albums`,
        );
      } catch (error) {
        console.error(`❌ Song sync failed for ${artist.name}:`, error);
        result.results.songs.errors = 1;
      }
    }

    // Step 3: Sync shows from Ticketmaster
    if (syncShows) {
      try {
        const showSyncService = new ShowSyncService();
        const showResult = await showSyncService.syncArtistShows(artist.id);
        result.results.shows.synced = showResult.shows?.length || 0;
        result.results.venues.synced = showResult.venues?.length || 0;
        console.log(
          `✅ Shows synced for ${artist.name}: ${result.results.shows.synced} shows, ${result.results.venues.synced} venues`,
        );
      } catch (error) {
        console.error(`❌ Show sync failed for ${artist.name}:`, error);
        result.results.shows.errors = 1;
        result.results.venues.errors = 1;
      }
    }

    // Step 4: Create default setlists
    if (createDefaultSetlists) {
      try {
        const setlistSyncService = new SetlistSyncService();
        const setlistResult = await setlistSyncService.createDefaultSetlists(artist.id);
        result.results.setlists.synced = setlistResult.created || 0;
        console.log(
          `✅ Default setlists created for ${artist.name}: ${result.results.setlists.synced} setlists`,
        );
      } catch (error) {
        console.error(`❌ Setlist creation failed for ${artist.name}:`, error);
        result.results.setlists.errors = 1;
      }
    }

    // Calculate final stats
    const totalErrors =
      result.results.songs.errors +
      result.results.shows.errors +
      result.results.venues.errors +
      result.results.setlists.errors;

    result.success = totalErrors === 0 && result.results.artist.updated;
    result.results.stats.calculated = true;

    console.log(`🎉 Unified sync completed for ${artist.name}:`, {
      success: result.success,
      songs: result.results.songs.synced,
      shows: result.results.shows.synced,
      setlists: result.results.setlists.synced,
    });

    return result;
  } catch (error) {
    console.error(`❌ Unified sync failed for artist ${artistId}:`, error);
    result.success = false;
    return result;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for CSRF token in production
    const headersList = await headers();
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = headersList.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // For development, we'll allow requests without auth
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body: UnifiedSyncRequest = await request.json();
    const { artistId, artistIds, mode, options } = body;

    console.log(`🚀 Unified sync request:`, { mode, artistId, artistIds, options });

    if (mode === "single") {
      if (!artistId) {
        return NextResponse.json(
          { error: "artistId is required for single mode" },
          { status: 400 },
        );
      }

      const result = await syncSingleArtist(artistId, options);
      return NextResponse.json(result, {
        status: result.success ? 200 : 500,
      });
    } else if (mode === "bulk") {
      if (!artistIds || !Array.isArray(artistIds)) {
        return NextResponse.json(
          { error: "artistIds array is required for bulk mode" },
          { status: 400 },
        );
      }

      const results = [];
      let totalSuccess = 0;

      for (const id of artistIds) {
        const result = await syncSingleArtist(id, options);
        results.push(result);
        if (result.success) totalSuccess++;

        // Add small delay between bulk syncs to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const bulkResult: SyncResult = {
        success: totalSuccess === artistIds.length,
        mode: "bulk",
        timestamp: new Date().toISOString(),
        results: {
          artist: { updated: totalSuccess > 0, data: { processed: artistIds.length, successful: totalSuccess } },
          songs: { synced: results.reduce((sum, r) => sum + r.results.songs.synced, 0), errors: results.reduce((sum, r) => sum + r.results.songs.errors, 0) },
          shows: { synced: results.reduce((sum, r) => sum + r.results.shows.synced, 0), errors: results.reduce((sum, r) => sum + r.results.shows.errors, 0) },
          venues: { synced: results.reduce((sum, r) => sum + r.results.venues.synced, 0), errors: results.reduce((sum, r) => sum + r.results.venues.errors, 0) },
          setlists: { synced: results.reduce((sum, r) => sum + r.results.setlists.synced, 0), errors: results.reduce((sum, r) => sum + r.results.setlists.errors, 0) },
          stats: { calculated: true },
        },
      };

      return NextResponse.json(bulkResult, {
        status: bulkResult.success ? 200 : 500,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid mode. Must be 'single' or 'bulk'" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Unified sync API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unified sync failed",
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