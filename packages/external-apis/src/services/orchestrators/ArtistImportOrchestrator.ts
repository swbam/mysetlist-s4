import { db, artists } from "@repo/database";
import { report } from "../progress/ProgressBus";
import { TicketmasterIngestService } from "../ingest/TicketmasterIngest";
import { SpotifyCatalogIngestService } from "../ingest/SpotifyCatalogIngest";
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
  return { artistId: artist[0].id, slug: artist[0].slug };
}

export async function runFullImport(artistId: string) {
  try {
    await report(artistId, "importing-shows", 25, "Syncing shows & venues…");
    const artist = await db.query.artists.findFirst({
      where: eq(artists.id, artistId),
    });
    if (!artist || !artist.tmAttractionId) {
      throw new Error("Artist or Ticketmaster attraction ID not found");
    }
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

    await report(
      artistId,
      "importing-songs",
      75,
      "Importing studio-only catalog…",
    );
    const updatedArtist = await db.query.artists.findFirst({
      where: eq(artists.id, artistId),
    });
    if (updatedArtist?.spotifyId) {
      const spotifyCatalogIngest = new SpotifyCatalogIngestService();
      await spotifyCatalogIngest.ingestStudioCatalog(
        artistId,
        updatedArtist.spotifyId,
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

    await db
      .update(artists)
      .set({ importStatus: "complete" })
      .where(eq(artists.id, artistId));
    await report(artistId, "completed", 100, "Import complete!");
  } catch (e: any) {
    await db
      .update(artists)
      .set({ importStatus: "failed" })
      .where(eq(artists.id, artistId));
    await report(artistId, "failed", 0, `Error: ${e?.message ?? "unknown"}`);
  }
}
