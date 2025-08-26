"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateImport = initiateImport;
exports.runFullImport = runFullImport;
const database_1 = require("@repo/database");
const ProgressBus_1 = require("../progress/ProgressBus");
const TicketmasterIngest_1 = require("../ingest/TicketmasterIngest");
const SpotifyCatalogIngest_1 = require("../ingest/SpotifyCatalogIngest");
const drizzle_orm_1 = require("drizzle-orm");
async function initiateImport(tmAttractionId) {
    const artistResults = await database_1.db
        .insert(database_1.artists)
        .values({
        tmAttractionId,
        name: "Loading…",
        slug: `tm-${tmAttractionId}`,
        importStatus: "in_progress",
    })
        .onConflictDoUpdate({
        target: database_1.artists.tmAttractionId,
        set: { importStatus: "in_progress" },
    })
        .returning();
    const artist = artistResults[0];
    if (!artist) {
        throw new Error("Failed to create or update artist");
    }
    await (0, ProgressBus_1.report)(artist.id, "initializing", 10, "Starting import…");
    // Skip queue system - use direct import approach per GROK.md
    console.log("Artist created, background import will start via SSE route");
    return { artistId: artist.id, slug: artist.slug };
}
async function runFullImport(artistId) {
    const artistResults = await database_1.db
        .select()
        .from(database_1.artists)
        .where((0, drizzle_orm_1.eq)(database_1.artists.id, artistId))
        .limit(1);
    let artist = artistResults[0];
    if (!artist) {
        await (0, ProgressBus_1.report)(artistId, "failed", 0, "Artist not found.");
        return;
    }
    try {
        // Phase 2: Ingest shows and venues from Ticketmaster
        if (artist.tmAttractionId) {
            await (0, ProgressBus_1.report)(artistId, "importing-shows", 25, "Syncing shows & venues…");
            await (0, TicketmasterIngest_1.ingestShowsAndVenues)(artistId, artist.tmAttractionId);
            await database_1.db
                .update(database_1.artists)
                .set({ showsSyncedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(database_1.artists.id, artistId));
            await (0, ProgressBus_1.report)(artistId, "importing-shows", 70, "Shows & venues updated.");
        }
        else {
            await (0, ProgressBus_1.report)(artistId, "importing-shows", 70, "Skipped show import (no Ticketmaster ID).");
        }
        // Re-fetch artist to get any updates from show ingest
        const updatedArtistResults = await database_1.db
            .select()
            .from(database_1.artists)
            .where((0, drizzle_orm_1.eq)(database_1.artists.id, artistId))
            .limit(1);
        artist = updatedArtistResults[0];
        // Phase 3: Ingest studio catalog from Spotify
        if (artist?.spotifyId) {
            await (0, ProgressBus_1.report)(artistId, "importing-songs", 75, "Importing studio-only catalog…");
            await (0, SpotifyCatalogIngest_1.ingestStudioCatalog)(artistId, artist.spotifyId);
            await database_1.db
                .update(database_1.artists)
                .set({ songCatalogSyncedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(database_1.artists.id, artistId));
            await (0, ProgressBus_1.report)(artistId, "importing-songs", 95, "Catalog complete.");
        }
        else {
            await (0, ProgressBus_1.report)(artistId, "importing-songs", 90, "Skipped catalog (no Spotify ID yet).");
        }
        // Phase 4: Create initial setlists for upcoming shows
        await (0, ProgressBus_1.report)(artistId, "creating-setlists", 95, "Creating initial setlists...");
        await createInitialSetlists(artistId);
        // Phase 5: Finalize import
        await database_1.db
            .update(database_1.artists)
            .set({ importStatus: "complete", lastFullSyncAt: new Date() })
            .where((0, drizzle_orm_1.eq)(database_1.artists.id, artistId));
        await (0, ProgressBus_1.report)(artistId, "completed", 100, "Import complete!");
    }
    catch (e) {
        console.error(`Import failed for artist ${artistId}:`, e);
        await database_1.db
            .update(database_1.artists)
            .set({ importStatus: "failed" })
            .where((0, drizzle_orm_1.eq)(database_1.artists.id, artistId));
        await (0, ProgressBus_1.report)(artistId, "failed", 0, `Error: ${e?.message ?? "unknown"}`);
    }
}
// Helper function to create initial setlists for upcoming shows
async function createInitialSetlists(artistId) {
    try {
        // Get upcoming shows for this artist
        const upcomingShows = await database_1.db
            .select()
            .from(database_1.shows)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(database_1.shows.headlinerArtistId, artistId), (0, drizzle_orm_1.eq)(database_1.shows.status, "upcoming")))
            .orderBy(database_1.shows.date)
            .limit(10);
        if (upcomingShows.length === 0) {
            console.log(`No upcoming shows found for artist ${artistId}`);
            return;
        }
        // Get top songs for this artist to populate setlists
        const topSongs = await database_1.db
            .select({
            id: database_1.songs.id,
            name: database_1.songs.name,
            popularity: database_1.songs.popularity,
        })
            .from(database_1.artistSongs)
            .innerJoin(database_1.songs, (0, drizzle_orm_1.eq)(database_1.artistSongs.songId, database_1.songs.id))
            .where((0, drizzle_orm_1.eq)(database_1.artistSongs.artistId, artistId))
            .orderBy((0, drizzle_orm_1.desc)(database_1.songs.popularity))
            .limit(20);
        console.log(`Found ${topSongs.length} songs for artist ${artistId}`);
        // Create predicted setlists for each upcoming show
        for (const show of upcomingShows) {
            // Check if setlist already exists
            const existingSetlist = await database_1.db
                .select()
                .from(database_1.setlists)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(database_1.setlists.showId, show.id), (0, drizzle_orm_1.eq)(database_1.setlists.type, "predicted")))
                .limit(1);
            if (existingSetlist.length > 0) {
                console.log(`Setlist already exists for show ${show.id}`);
                continue;
            }
            // Create the setlist
            const [newSetlist] = await database_1.db
                .insert(database_1.setlists)
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
                await database_1.db.insert(database_1.setlistSongs).values(setlistSongData);
                console.log(`Created setlist with ${songsToAdd.length} songs for show ${show.id}`);
            }
        }
        console.log(`Created setlists for ${upcomingShows.length} upcoming shows`);
    }
    catch (error) {
        console.error("Error creating initial setlists:", error);
        // Don't throw - this is not critical enough to fail the entire import
    }
}
