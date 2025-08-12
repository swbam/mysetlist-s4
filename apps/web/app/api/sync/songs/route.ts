import { artistSongs, db, eq } from "@repo/database";
import { artists, songs } from "@repo/database";
import { ArtistSyncService } from "@repo/external-apis";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

interface SongSyncRequest {
  artistId?: string;
  spotifyId?: string;
  fullDiscography?: boolean;
  batchSize?: number;
}

interface SongSyncResult {
  success: boolean;
  artistId: string;
  artistName: string;
  totalSongs: number;
  totalAlbums: number;
  processedAlbums: number;
  errors: string[];
  timestamp: string;
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

    const body: SongSyncRequest = await request.json();
    const {
      artistId,
      spotifyId,
      fullDiscography = true,
      batchSize = 50,
    } = body;

    // Validate input
    if (!artistId && !spotifyId) {
      return NextResponse.json(
        {
          error: "Must provide either artistId (database ID) or spotifyId",
        },
        { status: 400 },
      );
    }

    let targetArtist: any = null;
    let targetSpotifyId: string;

    // Find the artist in the database
    if (artistId) {
      // Get artist by database ID
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);

      if (!artist) {
        return NextResponse.json(
          { error: `Artist not found with ID: ${artistId}` },
          { status: 404 },
        );
      }

      if (!artist.spotifyId) {
        return NextResponse.json(
          { error: `Artist ${artist.name} has no Spotify ID` },
          { status: 400 },
        );
      }

      targetArtist = artist;
      targetSpotifyId = artist.spotifyId;
    } else if (spotifyId) {
      // Get artist by Spotify ID
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.spotifyId, spotifyId))
        .limit(1);

      if (!artist) {
        return NextResponse.json(
          { error: `Artist not found with Spotify ID: ${spotifyId}` },
          { status: 404 },
        );
      }

      targetArtist = artist;
      targetSpotifyId = spotifyId;
    }

    console.log(
      `🎵 Starting song sync for ${targetArtist.name} (${targetSpotifyId})...`,
    );

    const errors: string[] = [];
    let syncResult: any = null;

    try {
      const artistSyncService = new ArtistSyncService();

      if (fullDiscography) {
        // Sync the full discography
        syncResult = await artistSyncService.syncFullDiscography(targetSpotifyId);
        console.log(
          `✅ Full discography sync completed for ${targetArtist.name}:`,
          syncResult,
        );
      } else {
        // Just sync top tracks (fallback)
        await artistSyncService.syncArtist(targetSpotifyId);
        
        // Get song count after sync
        const songCount = await db
          .select({ count: db.count() })
          .from(artistSongs)
          .innerJoin(songs, eq(artistSongs.songId, songs.id))
          .where(eq(artistSongs.artistId, targetArtist.id));

        syncResult = {
          totalSongs: songCount[0]?.count || 0,
          totalAlbums: 1, // Estimate for top tracks
          processedAlbums: 1,
        };

        console.log(
          `✅ Top tracks sync completed for ${targetArtist.name}:`,
          syncResult,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Sync failed: ${errorMessage}`);
      console.error(`❌ Song sync failed for ${targetArtist.name}:`, error);
    }

    // Get final song count from database to verify
    const finalSongCount = await db
      .select({ count: db.count() })
      .from(artistSongs)
      .innerJoin(songs, eq(artistSongs.songId, songs.id))
      .where(eq(artistSongs.artistId, targetArtist.id));

    const result: SongSyncResult = {
      success: errors.length === 0,
      artistId: targetArtist.id,
      artistName: targetArtist.name,
      totalSongs: syncResult?.totalSongs || finalSongCount[0]?.count || 0,
      totalAlbums: syncResult?.totalAlbums || 0,
      processedAlbums: syncResult?.processedAlbums || 0,
      errors,
      timestamp: new Date().toISOString(),
    };

    // Update artist stats if sync was successful
    if (result.success && result.totalSongs > 0) {
      await db
        .update(artists)
        .set({
          totalSongs: result.totalSongs,
          totalAlbums: result.totalAlbums,
          songCatalogSyncedAt: new Date(),
          lastSyncedAt: new Date(),
        })
        .where(eq(artists.id, targetArtist.id));
    }

    console.log(
      `🎵 Song sync completed for ${targetArtist.name}: ${result.totalSongs} songs, ${result.totalAlbums} albums`,
    );

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error("Song sync API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Song sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// GET method to check song sync status for an artist
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get("artistId");
    const spotifyId = searchParams.get("spotifyId");

    if (!artistId && !spotifyId) {
      return NextResponse.json(
        { error: "Must provide either artistId or spotifyId" },
        { status: 400 },
      );
    }

    let whereClause;
    if (artistId) {
      whereClause = eq(artists.id, artistId);
    } else {
      whereClause = eq(artists.spotifyId, spotifyId!);
    }

    // Get artist info
    const [artist] = await db
      .select({
        id: artists.id,
        name: artists.name,
        spotifyId: artists.spotifyId,
        totalSongs: artists.totalSongs,
        totalAlbums: artists.totalAlbums,
        songCatalogSyncedAt: artists.songCatalogSyncedAt,
        lastSyncedAt: artists.lastSyncedAt,
      })
      .from(artists)
      .where(whereClause)
      .limit(1);

    if (!artist) {
      return NextResponse.json(
        { error: "Artist not found" },
        { status: 404 },
      );
    }

    // Get actual song count
    const songCount = await db
      .select({ count: db.count() })
      .from(artistSongs)
      .innerJoin(songs, eq(artistSongs.songId, songs.id))
      .where(eq(artistSongs.artistId, artist.id));

    const actualSongCount = songCount[0]?.count || 0;

    return NextResponse.json({
      artistId: artist.id,
      artistName: artist.name,
      spotifyId: artist.spotifyId,
      totalSongs: artist.totalSongs || 0,
      actualSongCount,
      totalAlbums: artist.totalAlbums || 0,
      songCatalogSyncedAt: artist.songCatalogSyncedAt,
      lastSyncedAt: artist.lastSyncedAt,
      isSynced: actualSongCount > 0,
      needsSync: actualSongCount === 0,
    });
  } catch (error) {
    console.error("Song sync status API error:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 },
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}