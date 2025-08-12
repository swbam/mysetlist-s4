import { artistSongs, artists, db, eq, songs } from "@repo/database";
import { sql } from "drizzle-orm";
import { ArtistSyncService } from "@repo/external-apis";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

interface SongSyncResult {
  success: boolean;
  message: string;
  processed: number;
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

    const body = await request.json();
    const { artistId, spotifyId, fullDiscography = true } = body;

    // Validate input
    if (!artistId && !spotifyId) {
      return NextResponse.json(
        { error: "Either artistId or spotifyId is required" },
        { status: 400 },
      );
    }

    // Resolve artist and spotifyId
    let targetArtist: any | null = null;
    let targetSpotifyId: string | null = null;

    if (artistId) {
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);

      if (!artist) {
        return NextResponse.json(
          { error: `Artist not found: ${artistId}` },
          { status: 404 },
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

    if (!targetArtist || !targetSpotifyId) {
      return NextResponse.json(
        { error: "Unable to resolve artist and Spotify ID for sync" },
        { status: 400 },
      );
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
        const countResult = await db.execute(sql`
          SELECT COUNT(*)::int as count
          FROM ${artistSongs}
          JOIN ${songs} ON ${artistSongs.songId} = ${songs.id}
          WHERE ${artistSongs.artistId} = ${targetArtist.id}
        `);
        const count = (countResult as any)?.rows?.[0]?.count ?? 0;
        
        syncResult = { totalSongs: count };
      }
    } catch (error) {
      console.error("Song sync failed:", error);
      errors.push(error instanceof Error ? error.message : String(error));
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: errors.length ? "Completed with errors" : "Song sync completed",
      processed: syncResult?.totalSongs || 0,
      timestamp: new Date().toISOString(),
      ...(syncResult && { result: syncResult }),
      ...(errors.length && { errors }),
    } satisfies SongSyncResult);
  } catch (error) {
    console.error("Songs sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        processed: 0,
        timestamp: new Date().toISOString(),
      } satisfies SongSyncResult,
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get("artistId");
    const spotifyId = searchParams.get("spotifyId");

    // Build where clause
    let whereClause: any;
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
    const countResult = await db.execute(sql`
      SELECT COUNT(*)::int as count
      FROM ${artistSongs}
      JOIN ${songs} ON ${artistSongs.songId} = ${songs.id}
      WHERE ${artistSongs.artistId} = ${artist.id}
    `);
    const actualSongCount = (countResult as any)?.rows?.[0]?.count ?? 0;

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
      { error: "Song sync status failed" },
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