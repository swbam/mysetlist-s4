import { db, artists, setlists, shows, songs, artistSongs, setlistSongs } from "@repo/database";
import { report } from "../progress/ProgressBus";
import { ingestShowsAndVenues } from "../ingest/TicketmasterIngest";
import { ingestStudioCatalog } from "../ingest/SpotifyCatalogIngest";
import { eq, desc, and } from "@repo/database";

export async function initiateImport(tmAttractionId: string) {
  const artistResults = await db
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

  const artist = artistResults[0];
  if (!artist) {
    throw new Error("Failed to create or update artist");
  }

  await report(artist.id, "initializing", 10, "Starting import…");

  // Skip queue system - use direct import approach per GROK.md
  console.log("Artist created, background import will start via SSE route");

  return { artistId: artist.id, slug: artist.slug };
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
    const updatedArtistResults = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);
    
    artist = updatedArtistResults[0];

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

    // Phase 4: Create initial setlists for upcoming shows
    await report(artistId, "creating-setlists", 95, "Creating initial setlists...");
    await createInitialSetlists(artistId);

    // Phase 5: Finalize import
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

// Helper function to create initial setlists for upcoming shows
async function createInitialSetlists(artistId: string) {
  try {
    // Get upcoming shows for this artist
    const upcomingShows = await db
      .select()
      .from(shows)
      .where(and(
        eq(shows.headlinerArtistId, artistId),
        eq(shows.status, "upcoming")
      ))
      .orderBy(shows.date)
      .limit(10);

    if (upcomingShows.length === 0) {
      console.log(`No upcoming shows found for artist ${artistId}`);
      return;
    }

    // Get top songs for this artist to populate setlists
    const topSongs = await db
      .select({
        id: songs.id,
        name: songs.name,
        popularity: songs.popularity,
      })
      .from(artistSongs)
      .innerJoin(songs, eq(artistSongs.songId, songs.id))
      .where(eq(artistSongs.artistId, artistId))
      .orderBy(desc(songs.popularity))
      .limit(20);

    console.log(`Found ${topSongs.length} songs for artist ${artistId}`);

    // Create predicted setlists for each upcoming show
    for (const show of upcomingShows) {
      // Check if setlist already exists
      const existingSetlist = await db
        .select()
        .from(setlists)
        .where(and(
          eq(setlists.showId, show.id),
          eq(setlists.type, "predicted")
        ))
        .limit(1);

      if (existingSetlist.length > 0) {
        console.log(`Setlist already exists for show ${show.id}`);
        continue;
      }

      // Create the setlist
      const [newSetlist] = await db
        .insert(setlists)
        .values({
          showId: show.id,
          artistId: artistId,
          type: "predicted",
          name: "Predicted Setlist",
        })
        .returning();

      if (newSetlist && topSongs.length > 0) {
        // Add top 15 songs to the setlist
        const songsToAdd = topSongs.slice(0, 15);
        const setlistSongData = songsToAdd.map((song, index) => ({
          setlistId: newSetlist.id,
          songId: song.id,
          position: index + 1,
        }));

        await db.insert(setlistSongs).values(setlistSongData);
        console.log(`Created setlist with ${songsToAdd.length} songs for show ${show.id}`);
      }
    }

    console.log(`Created setlists for ${upcomingShows.length} upcoming shows`);
  } catch (error) {
    console.error("Error creating initial setlists:", error);
    // Don't throw - this is not critical enough to fail the entire import
  }
}
