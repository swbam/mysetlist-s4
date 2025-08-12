import { artists, db } from "@repo/database";
import { ArtistSyncService } from "@repo/external-apis";
import { desc, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Check for authorization
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { limit = 20, mode = "auto", artistId } = body;

    const syncService = new ArtistSyncService();

    let result;
    if (artistId) {
      // Sync specific artist by ID
      const artist = await db
        .select({ spotifyId: artists.spotifyId, name: artists.name })
        .from(artists)
        .where(sql`${artists.id} = ${artistId}`)
        .limit(1);
      
      if (artist.length === 0) {
        return NextResponse.json(
          { error: `Artist not found with ID: ${artistId}` },
          { status: 404 }
        );
      }
      
      if (artist[0].spotifyId) {
        await syncService.syncArtist(artist[0].spotifyId);
        result = { syncedCount: 1, artistName: artist[0].name };
      } else {
        result = { syncedCount: 0, error: "No Spotify ID found" };
      }
    } else if (mode === "popular") {
      // Sync popular artists from various genres
      result = await syncService.syncPopularArtists();
    } else {
      // Sync existing artists that haven't been updated recently
      const outdatedArtists = await db
        .select({ spotifyId: artists.spotifyId, name: artists.name })
        .from(artists)
        .where(
          sql`${artists.lastSyncedAt} IS NULL OR ${artists.lastSyncedAt} < NOW() - INTERVAL '7 days'`,
        )
        .orderBy(desc(artists.popularity))
        .limit(limit);

      let synced = 0;
      for (const artist of outdatedArtists) {
        if (artist.spotifyId) {
          try {
            await syncService.syncArtist(artist.spotifyId);
            synced++;
          } catch (error) {
            console.error(`Failed to sync artist ${artist.name}:`, error);
          }
        }
      }

      result = { syncedCount: synced, totalFound: outdatedArtists.length };
    }

    return NextResponse.json({
      success: true,
      mode,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Artist sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Artist sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check for authorization
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const mode = searchParams.get("mode") || "auto";

    const syncService = new ArtistSyncService();

    let result;
    if (mode === "popular") {
      result = await syncService.syncPopularArtists();
    } else {
      // Sync existing artists that haven't been updated recently
      const outdatedArtists = await db
        .select({ spotifyId: artists.spotifyId, name: artists.name })
        .from(artists)
        .where(
          sql`${artists.lastSyncedAt} IS NULL OR ${artists.lastSyncedAt} < NOW() - INTERVAL '7 days'`,
        )
        .orderBy(desc(artists.popularity))
        .limit(limit);

      let synced = 0;
      for (const artist of outdatedArtists) {
        if (artist.spotifyId) {
          try {
            await syncService.syncArtist(artist.spotifyId);
            synced++;
          } catch (error) {
            console.error(`Failed to sync artist ${artist.name}:`, error);
          }
        }
      }

      result = { syncedCount: synced, totalFound: outdatedArtists.length };
    }

    return NextResponse.json({
      success: true,
      mode,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Artist sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Artist sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
