import { spotify, setlistfm, ticketmaster } from "@repo/external-apis";
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { CACHE_TAGS } from "~/lib/cache";
import { db, artists, shows, songs, setlists, setlistSongs, artistSongs } from "@repo/database";
import { eq } from "drizzle-orm";
import { updateImportStatus } from "../[artistId]/import-status/route";

export async function POST(request: NextRequest) {
  let tempArtistId: string | null = null;
  
  try {
    const body = await request.json();
    const { tmAttractionId } = body;

    if (!tmAttractionId) {
      return NextResponse.json(
        { error: "tmAttractionId is required" },
        { status: 400 },
      );
    }

    // Create a temporary artist ID for status tracking before we have a real one
    tempArtistId = `tmp_${tmAttractionId}`;

    // Initialize import status tracking
    await updateImportStatus(tempArtistId, {
      stage: 'initializing',
      progress: 0,
      message: 'Checking if artist already exists...',
    });

    // Check if artist already exists by ticketmaster ID (idempotency)
    const existingArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.ticketmasterId, tmAttractionId))
      .limit(1);

    if (Array.isArray(existingArtist) && existingArtist.length > 0 && existingArtist[0]) {
      const artistId = (existingArtist[0] as any).id;
      
      // Update status for existing artist
      await updateImportStatus(artistId, {
        stage: 'completed',
        progress: 100,
        message: 'Artist already exists in database',
        completedAt: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          artistId,
          slug: (existingArtist[0] as any).slug,
          alreadyExists: true,
        },
        { status: 200 },
      );
    }

    // Update status: fetching artist details
    await updateImportStatus(tempArtistId, {
      stage: 'fetching-artist',
      progress: 10,
      message: 'Fetching artist details from Ticketmaster...',
    });

    // First, get artist details from Ticketmaster with retry logic
    let artistName: string = '';
    let imageUrl: string | undefined;
    let genres: string[] = [];
    
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[IMPORT] Fetching artist details (attempt ${attempt}/${maxRetries}): ${tmAttractionId}`);
        
        const tmArtist: any = await ticketmaster.getArtistDetails(tmAttractionId);
        if (!tmArtist || typeof (tmArtist as any).name !== 'string') {
          const error = new Error("Artist not found on Ticketmaster");
          await updateImportStatus(tempArtistId, {
            stage: 'failed',
            progress: 0,
            message: 'Artist not found on Ticketmaster',
            error: error.message,
            completedAt: new Date().toISOString(),
          });
          return NextResponse.json(
            { error: "Artist not found on Ticketmaster" },
            { status: 404 },
          );
        }
        
        artistName = (tmArtist as any).name as string;
        imageUrl = typeof (tmArtist as any).imageUrl === 'string' ? (tmArtist as any).imageUrl : undefined;
        genres = Array.isArray((tmArtist as any).genres) ? (tmArtist as any).genres as string[] : [];
        
        console.log(`[IMPORT] Successfully fetched artist: ${artistName}`);
        break; // Success, exit retry loop
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`[IMPORT] Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          await updateImportStatus(tempArtistId, {
            stage: 'failed',
            progress: 0,
            message: 'Failed to fetch artist details from Ticketmaster after multiple attempts',
            error: lastError.message,
            completedAt: new Date().toISOString(),
          });
          return NextResponse.json(
            { error: "Failed to fetch artist details from Ticketmaster" },
            { status: 500 },
          );
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    // Update status: creating artist record
    await updateImportStatus(tempArtistId, {
      stage: 'syncing-identifiers',
      progress: 25,
      message: `Creating artist record for ${artistName}...`,
    });

    // Generate slug from artist name
    const slug = artistName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Initialize artist data (stub record)
    let artistData: any = {
      name: artistName,
      slug,
      imageUrl: imageUrl,
      genres: JSON.stringify(genres || []),
      ticketmasterId: tmAttractionId,
      verified: false,
      popularity: 0,
      songCatalogSyncedAt: null, // Will be updated during background sync
    };

    // Quick Spotify lookup for basic data with retry logic
    try {
      await updateImportStatus(tempArtistId, {
        stage: 'syncing-identifiers',
        progress: 30,
        message: 'Looking up artist on Spotify...',
      });

      const spotifyRetries = 2;
      for (let spotifyAttempt = 1; spotifyAttempt <= spotifyRetries; spotifyAttempt++) {
        try {
          await spotify.authenticate();
          const spotifyResults: any = await spotify.searchArtists(artistName, 1);
          if (spotifyResults?.artists?.items?.length > 0) {
            const spotifyArtist = spotifyResults.artists.items[0];
            if (spotifyArtist) {
              artistData.spotifyId = spotifyArtist.id;
              // Use Spotify image if Ticketmaster didn't provide one
              if (!artistData.imageUrl && spotifyArtist.images[0]) {
                artistData.imageUrl = spotifyArtist.images[0].url;
              }
              console.log(`[IMPORT] Found Spotify artist: ${spotifyArtist.id}`);
            }
          }
          break; // Success
        } catch (spotifyError) {
          console.warn(`[IMPORT] Spotify lookup attempt ${spotifyAttempt} failed:`, spotifyError);
          if (spotifyAttempt === spotifyRetries) {
            console.warn("[IMPORT] Failed to fetch basic Spotify data after retries, continuing without it");
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    } catch (error) {
      console.warn("[IMPORT] Spotify lookup failed, continuing without it:", error);
    }

    // Insert the new artist
    await updateImportStatus(tempArtistId, {
      stage: 'syncing-identifiers',
      progress: 40,
      message: 'Saving artist to database...',
    });

    const [newArtist] = await db
      .insert(artists)
      .values(artistData)
      .returning({ id: artists.id, slug: artists.slug, name: artists.name });

    if (!newArtist) {
      const error = new Error("Failed to insert artist");
      await updateImportStatus(tempArtistId, {
        stage: 'failed',
        progress: 0,
        message: 'Failed to create artist record',
        error: error.message,
        completedAt: new Date().toISOString(),
      });
      console.error("[IMPORT] Failed to insert artist");
      return NextResponse.json(
        { error: "Failed to create artist" },
        { status: 500 },
      );
    }

    // Now we have a real artist ID, update the status tracking
    const artistId = newArtist.id;
    await updateImportStatus(artistId, {
      stage: 'syncing-identifiers',
      progress: 50,
      message: 'Artist created successfully. Starting background sync...',
    });

    // Revalidate cache
    revalidateTag(CACHE_TAGS.artists);

    // Enhanced background job system with proper tracking and retry logic
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3001';
    
    // Start background processing immediately (no await - fire and forget)
    processArtistBackground(artistId, baseUrl).catch((error) => {
      console.error(`[IMPORT] Background processing failed for artist ${artistId}:`, error);
    });

    return NextResponse.json(
      {
        artistId: newArtist.id,
        slug: newArtist.slug,
        importStarted: true,
        statusEndpoint: `/api/artists/${newArtist.id}/import-status`,
      },
      { status: 201 },
    );
  } catch (error) {
    // Enhanced error handling with status update
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[IMPORT] Import API error:", error);

    if (tempArtistId) {
      try {
        await updateImportStatus(tempArtistId, {
          stage: 'failed',
          progress: 0,
          message: 'Import failed due to unexpected error',
          error: errorMessage,
          completedAt: new Date().toISOString(),
        });
      } catch (statusError) {
        console.error("[IMPORT] Failed to update error status:", statusError);
      }
    }

    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}

// Enhanced background processing function with proper job tracking
async function processArtistBackground(artistId: string, baseUrl: string): Promise<void> {
  try {
    console.log(`[BACKGROUND] Starting background processing for artist ${artistId}`);

    // Phase 1: Sync additional identifiers
    await updateImportStatus(artistId, {
      stage: 'syncing-identifiers',
      progress: 60,
      message: 'Syncing additional artist identifiers...',
    });

    await executeWithRetry(
      () => fetch(`${baseUrl}/api/cron/sync-artist-data`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ artistId }),
      }),
      'artist data sync',
      artistId
    );

    // Phase 2: Import songs
    await updateImportStatus(artistId, {
      stage: 'importing-songs',
      progress: 70,
      message: 'Importing artist song catalog...',
    });

    await executeWithRetry(
      () => fetch(`${baseUrl}/api/sync/songs`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ 
          artistId, 
          fullDiscography: true,
          batchSize: 50 
        }),
      }),
      'song sync',
      artistId
    );

    // Phase 3: Import shows
    await updateImportStatus(artistId, {
      stage: 'importing-shows',
      progress: 85,
      message: 'Importing artist shows and venues...',
    });

    await executeWithRetry(
      () => fetch(`${baseUrl}/api/sync/shows`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ artistId }),
      }),
      'show sync',
      artistId
    );

    // Phase 4: Create initial setlists
    await updateImportStatus(artistId, {
      stage: 'creating-setlists',
      progress: 95,
      message: 'Creating initial setlists...',
    });

    // Wait a bit for the sync to populate data, then create setlists
    await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds
    
    try {
      await createInitialSetlistsForNewShows(artistId);
    } catch (error) {
      console.warn(`[BACKGROUND] Failed to create initial setlists for ${artistId}:`, error);
      // Don't fail the entire import for this
    }

    // Mark as completed
    await updateImportStatus(artistId, {
      stage: 'completed',
      progress: 100,
      message: 'Import completed successfully!',
      completedAt: new Date().toISOString(),
    });

    console.log(`[BACKGROUND] Successfully completed background processing for artist ${artistId}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[BACKGROUND] Background processing failed for artist ${artistId}:`, error);
    
    await updateImportStatus(artistId, {
      stage: 'failed',
      progress: 0,
      message: 'Background sync failed',
      error: errorMessage,
      completedAt: new Date().toISOString(),
    });
  }
}

// Helper function to execute API calls with retry logic
async function executeWithRetry(
  fn: () => Promise<Response>,
  taskName: string,
  artistId: string,
  maxRetries: number = 3
): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[BACKGROUND] Executing ${taskName} for ${artistId} (attempt ${attempt}/${maxRetries})`);
      
      const response = await fn();
      
      if (response.ok) {
        console.log(`[BACKGROUND] Successfully completed ${taskName} for ${artistId}`);
        return;
      } else {
        throw new Error(`${taskName} failed with status ${response.status}`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`[BACKGROUND] ${taskName} attempt ${attempt} failed for ${artistId}:`, error);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 2^attempt seconds
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[BACKGROUND] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`${taskName} failed after ${maxRetries} attempts: ${lastError?.message}`);
}

// Helper function to create initial setlists for new shows
async function createInitialSetlistsForNewShows(artistId: string): Promise<void> {
  try {
    // Get artist's songs (excluding live tracks)
    const artistSongsQuery = await db
      .select({
        id: songs.id,
        title: songs.title,
        popularity: songs.popularity,
      })
      .from(songs)
      .innerJoin(artistSongs, eq(songs.id, artistSongs.songId))
      .where(eq(artistSongs.artistId, artistId))
      .limit(50); // Get up to 50 songs for selection

    // Filter out live tracks by name patterns
    const nonLiveSongs = artistSongsQuery.filter(song => {
      const songName = song.title.toLowerCase();
      return !songName.includes('live') && 
             !songName.includes('acoustic') &&
             !songName.includes('unplugged') &&
             !songName.includes('session');
    });

    if (nonLiveSongs.length === 0) {
      console.log("No non-live songs found for artist, skipping setlist creation");
      return;
    }

    // Get recent shows without setlists
    const recentShows = await db
      .select()
      .from(shows)
      .where(eq(shows.headlinerArtistId, artistId))
      .limit(20);

    for (const show of recentShows) {
      // Check if setlist already exists
      const existingSetlist = await db
        .select()
        .from(setlists)
        .where(eq(setlists.showId, show.id))
        .limit(1);

      if (existingSetlist.length > 0) {
        continue; // Skip if setlist already exists
      }

      // Create setlist
      const [newSetlist] = await db
        .insert(setlists)
        .values({
          showId: show.id,
          artistId: show.headlinerArtistId,
          type: 'predicted',
          name: `${show.name} - Predicted Setlist`,
          orderIndex: 0,
          isLocked: false,
          totalVotes: 0,
        } as any)
        .returning({ id: setlists.id });

      if (newSetlist && (newSetlist as any).id) {
        // Select 5 songs (prioritize by popularity, then random)
        const sortedSongs = nonLiveSongs
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, 10) // Take top 10 by popularity
          .sort(() => 0.5 - Math.random()) // Randomize the top songs
          .slice(0, 5); // Select 5

        // Add songs to setlist
        const setlistSongData = sortedSongs.map((song, index) => ({
          setlistId: (newSetlist as any).id as string,
          songId: song.id as string,
          position: index + 1,
          upvotes: 0,
        }));

        await db.insert(setlistSongs).values(setlistSongData as any);
        console.log(`Created initial setlist for ${show.name} with ${sortedSongs.length} songs`);
      }
    }
  } catch (error) {
    console.error("Failed to create initial setlists:", error);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tmAttractionId = searchParams.get("tmAttractionId");

  if (!tmAttractionId) {
    return NextResponse.json(
      { error: "tmAttractionId is required" },
      { status: 400 },
    );
  }

  try {
    // Check if artist exists
    const existingArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.ticketmasterId, tmAttractionId))
      .limit(1);

    if (Array.isArray(existingArtist) && existingArtist.length > 0 && existingArtist[0]) {
      return NextResponse.json({
        exists: true,
        artistId: (existingArtist[0] as any).id,
        slug: (existingArtist[0] as any).slug,
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error("Import check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}