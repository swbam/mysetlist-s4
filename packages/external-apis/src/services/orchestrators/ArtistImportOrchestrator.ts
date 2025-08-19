import { db, artists } from "@repo/database";
import { report } from "../progress/ProgressBus";
import { ingestShowsAndVenues } from "../ingest/TicketmasterIngest";
import { ingestStudioCatalog } from "../ingest/SpotifyCatalogIngest";
import { eq } from "drizzle-orm";

export async function initiateImport(tmAttractionId: string) {
  const artist = await db
    .insert(artists)
    .values({
      tmAttractionId,
      name: "Loading…",
      slug: `tm-${tmAttractionId}`,
      importStatus: "in_progress",
    })
    .onConflictDoUpdate({
      target: artists.tmAttractionId,
      set: { importStatus: "in_progress" },
    })
    .returning();

  await report(artist[0].id, "initializing", 10, "Starting import…");

  // Return artist info and let the caller handle queue job creation
  return { 
    artistId: artist[0].id, 
    slug: artist[0].slug,
    tmAttractionId,
    spotifyArtistId: artist[0].spotifyId,
    artistName: artist[0].name,
  };
}

export async function runFullImport(artistId: string) {
  let artist = await db.query.artists.findFirst({
    where: eq(artists.id, artistId),
  });

  if (!artist) {
    await report(artistId, "failed", 0, "Artist not found.");
    return;
  }

  try {
    // Phase 2: Ingest shows and venues from Ticketmaster
    if (artist.tmAttractionId) {
      await report(artistId, "importing-shows", 25, "Syncing shows & venues…");
      await ingestShowsAndVenues(
        artistId,
        artist.tmAttractionId,
      );
      await db
        .update(artists)
        .set({ showsSyncedAt: new Date() })
        .where(eq(artists.id, artistId));
      await report(artistId, "importing-shows", 70, "Shows & venues updated.");
    } else {
      await report(
        artistId,
        "importing-shows",
        70,
        "Skipped show import (no Ticketmaster ID).",
      );
    }

    // Re-fetch artist to get any updates from show ingest
    artist = await db.query.artists.findFirst({
      where: eq(artists.id, artistId),
    });

    // Phase 3: Ingest studio catalog from Spotify
    if (artist?.spotifyId) {
      await report(
        artistId,
        "importing-songs",
        75,
        "Importing studio-only catalog…",
      );
      await ingestStudioCatalog(
        artistId,
        artist.spotifyId,
      );
      await db
        .update(artists)
        .set({ songCatalogSyncedAt: new Date() })
        .where(eq(artists.id, artistId));
      await report(artistId, "importing-songs", 95, "Catalog complete.");
    } else {
      await report(
        artistId,
        "importing-songs",
        90,
        "Skipped catalog (no Spotify ID yet).",
      );
    }

    // Phase 4: Finalize import
    await db
      .update(artists)
      .set({ importStatus: "complete", lastFullSyncAt: new Date() })
      .where(eq(artists.id, artistId));
    await report(artistId, "completed", 100, "Import complete!");
  } catch (e: any) {
    console.error(`Import failed for artist ${artistId}:`, e);
    await db
      .update(artists)
      .set({ importStatus: "failed" })
      .where(eq(artists.id, artistId));
    await report(artistId, "failed", 0, `Error: ${e?.message ?? "unknown"}`);
  }
}
