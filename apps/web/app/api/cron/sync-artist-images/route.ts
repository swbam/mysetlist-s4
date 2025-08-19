import { db, artists } from "@repo/database";
import { SpotifyClient } from "@repo/external-apis";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from "~/lib/api/auth-helpers";

export const dynamic = "force-dynamic";

async function executeArtistImageSync() {
  const spotify = new SpotifyClient({});
  await spotify.authenticate();

  // Find artists missing images but with a spotifyId
  const targets = await db
    .select({ id: artists.id, spotifyId: artists.spotifyId, name: artists.name })
    .from(artists)
    .where(and(isNull(artists.imageUrl), isNull(artists.smallImageUrl)))
    .limit(50);

  let processed = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const a of targets) {
    try {
      processed++;
      if (!a.spotifyId) continue;
      const sp = await spotify.getArtist(a.spotifyId);
      const imageUrl = sp.images?.[0]?.url || null;
      const smallImageUrl = sp.images?.[2]?.url || sp.images?.[1]?.url || null;
      if (imageUrl || smallImageUrl) {
        await db
          .update(artists)
          .set({ imageUrl, smallImageUrl, updatedAt: new Date() })
          .where(eq(artists.id, a.id));
        updated++;
      }
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  try {
    await db.execute(
      sql`SELECT log_cron_run('sync-artist-images', 'success', ${JSON.stringify({ processed, updated, errors })})`,
    );
  } catch {}

  return { message: "Artist image sync completed", processed, updated, errors };
}

export async function POST(request: NextRequest) {
  try {
    await requireCronAuth();
    const result = await executeArtistImageSync();
    return createSuccessResponse(result);
  } catch (error) {
    try {
      await db.execute(sql`SELECT log_cron_run('sync-artist-images', 'failed')`);
    } catch {}
    return createErrorResponse(
      "Artist image sync failed",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
