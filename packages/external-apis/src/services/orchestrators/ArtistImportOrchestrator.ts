import { db, artists, eq } from "@repo/database";
import { report } from "../progress/ProgressBus";
import { TicketmasterIngestService } from "../ingest/TicketmasterIngest";
import { SpotifyCatalogIngestService } from "../ingest/SpotifyCatalogIngest";

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

  if (!artist[0]) {
    throw new Error("Failed to create artist");
  }

  await report(artist[0].id, "initializing", 10, "Starting import…");
  return { artistId: artist[0].id, slug: artist[0].slug };
}

export async function runFullImport(artistId: string) {
  const artistResults = await db
    .select()
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);
  let artist = artistResults[0];

  if (!artist) {
    await report(artistId, "failed", 0, "Artist not found.");
    return;
  }

  try {
    // Phase 2: Ingest shows and venues from Ticketmaster
    if (artist.tmAttractionId) {
      await report(artistId, "importing-shows", 25, "Syncing shows & venues…");
      const ticketmasterIngest = new TicketmasterIngestService();
      await ticketmasterIngest.ingestShowsAndVenues(
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
    const refetchResults = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);
    artist = refetchResults[0];

    // Phase 3: Ingest studio catalog from Spotify
    if (artist?.spotifyId) {
      await report(
        artistId,
        "importing-songs",
        75,
        "Importing studio-only catalog…",
      );
      const spotifyCatalogIngest = new SpotifyCatalogIngestService();
      await spotifyCatalogIngest.ingestStudioCatalog(
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
