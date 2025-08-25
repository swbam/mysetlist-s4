import { artists, db } from "@repo/database";
import { ArtistSyncService } from "@repo/external-apis";
import { desc, sql } from "drizzle-orm";
import { type NextRequest } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from "~/lib/api/auth-helpers";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Standardized authentication
    await requireCronAuth();

    const body = await request.json().catch(() => ({}));
    const { limit = 20, mode = "auto", artistId } = body;

    const syncService = new ArtistSyncService();

    let result: any;
    if (artistId) {
      // Sync specific artist by ID
      const artist = await db
        .select({ spotifyId: artists.spotifyId, name: artists.name })
        .from(artists)
        .where(sql`${artists.id} = ${artistId}`)
        .limit(1);

      if (artist.length === 0) {
        return createErrorResponse(
          `Artist not found with ID: ${artistId}`,
          404
        );
      }

      const found = artist[0];
      if (found?.spotifyId) {
        await syncService.syncArtist(found.spotifyId as string);
        result = { syncedCount: 1, artistName: found.name };
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

    return createSuccessResponse({
      mode,
      result,
    });
  } catch (error) {
    console.error("Artist sync failed:", error);
    return createErrorResponse(
      "Artist sync failed",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Standardized authentication
    await requireCronAuth();

    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const mode = searchParams.get("mode") || "auto";

    const syncService = new ArtistSyncService();

    let result: any;
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

    return createSuccessResponse({
      mode,
      result,
    });
  } catch (error) {
    console.error("Artist sync failed:", error);
    return createErrorResponse(
      "Artist sync failed",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
