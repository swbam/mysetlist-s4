import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, artists, songs, artistSongs, setlists, setlistSongs, shows, eq, sql } from "@repo/database";
import { 
  ArtistSyncService, 
  ShowSyncService, 
  SetlistSyncService,
  spotify
} from "@repo/external-apis";

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
  status: 'pending' | 'running' | 'completed' | 'failed';
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
        fullDiscography: true
      }
    } = body;

    // Validate input
    if (!spotifyId && !ticketmasterId && !mbid && !artistName) {
      return NextResponse.json({ 
        error: "Must provide at least one artist identifier (spotifyId, ticketmasterId, mbid, or artistName)" 
      }, { status: 400 });
    }

    const steps: SyncStep[] = [
      { step: "1. Sync artist core details from Spotify", status: 'pending' },
      { step: "2. Sync FULL song catalog from Spotify", status: 'pending' },
      { step: "3. Sync upcoming shows from Ticketmaster", status: 'pending' },
      { step: "4. Create default predicted setlists", status: 'pending' }
    ];

    let artistData: any = null;
    let artistId: string | null = null;

    // Step 1: Sync artist core details from Spotify
    steps[0].status = 'running';
    steps[0].startTime = new Date().toISOString();

    try {
      const artistSyncService = new ArtistSyncService();
      
      // Find or resolve artist Spotify ID
      if (spotifyId) {
        artistId = spotifyId;
      } else if (artistName) {
        // Search for artist by name
        await spotify.authenticate();
        const searchResult = await spotify.searchArtists(artistName, 1);
        if (searchResult.artists.items.length > 0) {
          artistId = searchResult.artists.items[0].id;
        }
      }

      if (!artistId) {
        throw new Error(`Could not resolve Spotify ID for artist`);
      }

      // Sync basic artist data
      await artistSyncService.syncArtist(artistId);

      // Get artist from database
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.spotifyId, artistId))
        .limit(1);

      if (!artist) {
        throw new Error(`Artist not found in database after sync`);
      }

      artistData = artist;
      steps[0].status = 'completed';
      steps[0].endTime = new Date().toISOString();
      steps[0].result = { artistId: artist.id, name: artist.name };

    } catch (error) {
      steps[0].status = 'failed';
      steps[0].endTime = new Date().toISOString();
      steps[0].error = error instanceof Error ? error.message : 'Unknown error';
      
      return NextResponse.json({
        success: false,
        error: "Failed to sync artist core details",
        steps,
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }

    // Step 2: Sync FULL song catalog from Spotify
    if (options.syncSongs && artistId) {
      steps[1].status = 'running';
      steps[1].startTime = new Date().toISOString();

      try {
        const artistSyncService = new ArtistSyncService();
        const songsResult = await artistSyncService.syncFullDiscography(artistId);
        
        steps[1].status = 'completed';
        steps[1].endTime = new Date().toISOString();
        steps[1].result = songsResult;

      } catch (error) {
        steps[1].status = 'failed';
        steps[1].endTime = new Date().toISOString();
        steps[1].error = error instanceof Error ? error.message : 'Unknown error';
      }
    } else {
      steps[1].status = 'completed';
      steps[1].result = { skipped: true, reason: 'syncSongs disabled or no artistId' };
    }

    // Step 3: Sync upcoming shows from Ticketmaster
    if (options.syncShows && artistData) {
      steps[2].status = 'running';
      steps[2].startTime = new Date().toISOString();

      try {
        const showSyncService = new ShowSyncService();
        const showsResult = await showSyncService.syncArtistShows(artistData.id);

        steps[2].status = 'completed';
        steps[2].endTime = new Date().toISOString();
        steps[2].result = showsResult;

      } catch (error) {
        steps[2].status = 'failed';
        steps[2].endTime = new Date().toISOString();
        steps[2].error = error instanceof Error ? error.message : 'Unknown error';
      }
    } else {
      steps[2].status = 'completed';
      steps[2].result = { skipped: true, reason: 'syncShows disabled or no artist data' };
    }

    // Step 4: Create default predicted setlists
    if (options.createDefaultSetlists && artistData) {
      steps[3].status = 'running';
      steps[3].startTime = new Date().toISOString();

      try {
        const setlistSyncService = new SetlistSyncService();
        const setlistResult = await setlistSyncService.createDefaultSetlists(artistData.id);

        steps[3].status = 'completed';
        steps[3].endTime = new Date().toISOString();
        steps[3].result = setlistResult;

      } catch (error) {
        steps[3].status = 'failed';
        steps[3].endTime = new Date().toISOString();
        steps[3].error = error instanceof Error ? error.message : 'Unknown error';
      }
    } else {
      steps[3].status = 'completed';
      steps[3].result = { skipped: true, reason: 'createDefaultSetlists disabled or no artist data' };
    }

    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const failedSteps = steps.filter(s => s.status === 'failed').length;

    return NextResponse.json({
      success: failedSteps === 0,
      artist: artistData,
      summary: {
        totalSteps: steps.length,
        completed: completedSteps,
        failed: failedSteps,
        successRate: `${Math.round((completedSteps / steps.length) * 100)}%`
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
      { status: 500 }
    );
  }
}

