"use strict";
// MySetlist-S4 Complete Artist Import Processor
// File: apps/web/lib/queues/processors/artist-import.processor.ts
// NEW FILE - Core processor for artist import jobs
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtistImportProcessor = void 0;
const database_1 = require("@repo/database");
const external_apis_1 = require("@repo/external-apis");
const import_status_1 = require("~/lib/import-status");
const import_logger_1 = require("~/lib/import-logger");
const redis_config_1 = require("../redis-config");
class ArtistImportProcessor {
    static spotifyClient = new external_apis_1.SpotifyClient();
    static ticketmasterClient = new external_apis_1.TicketmasterClient();
    static redis = redis_config_1.RedisClientFactory.getClient('pubsub');
    static async process(job) {
        const { tmAttractionId, artistId, syncOnly = false } = job.data;
        const logger = new import_logger_1.ImportLogger(job.id || "unknown");
        const startTime = Date.now();
        const phaseTimings = {
            phase1Duration: 0,
            phase2Duration: 0,
            phase3Duration: 0,
        };
        try {
            logger.info("Starting artist import process", {
                tmAttractionId,
                artistId,
                syncOnly,
                jobId: job.id,
            });
            await job.updateProgress(0);
            await (0, import_status_1.updateImportStatus)(artistId, {
                stage: "initializing",
                progress: 0,
                message: "Starting artist import process",
                job_id: job.id,
            });
            let artist;
            // Phase 1: Basic artist data (must complete quickly < 3 seconds)
            const phase1Start = Date.now();
            if (!artistId || !syncOnly) {
                artist = await this.executePhase1(tmAttractionId, job);
            }
            else {
                artist = await database_1.db
                    .select()
                    .from(database_1.artists)
                    .where((0, database_1.eq)(database_1.artists.id, artistId))
                    .get();
            }
            phaseTimings.phase1Duration = Date.now() - phase1Start;
            if (!artist) {
                throw new Error("Failed to create or find artist");
            }
            await job.updateProgress(20);
            await (0, import_status_1.updateImportStatus)(artist.id, {
                stage: "syncing-identifiers",
                progress: 20,
                message: "Artist created, syncing identifiers",
                artist_name: artist.name,
            });
            // Phase 2: Shows and venues (background processing)
            const phase2Start = Date.now();
            const showsResult = await this.executePhase2(artist, job);
            phaseTimings.phase2Duration = Date.now() - phase2Start;
            await job.updateProgress(60);
            await (0, import_status_1.updateImportStatus)(artist.id, {
                stage: "importing-shows",
                progress: 60,
                message: `Imported ${showsResult.totalShows} shows and ${showsResult.venuesCreated} venues`,
                total_shows: showsResult.totalShows,
                total_venues: showsResult.venuesCreated,
            });
            // Phase 3: Complete song catalog (background processing)
            const phase3Start = Date.now();
            const catalogResult = await this.executePhase3(artist, job);
            phaseTimings.phase3Duration = Date.now() - phase3Start;
            await job.updateProgress(90);
            await (0, import_status_1.updateImportStatus)(artist.id, {
                stage: "importing-songs",
                progress: 90,
                message: `Imported ${catalogResult.totalSongs} songs from ${catalogResult.totalAlbums} albums`,
                total_songs: catalogResult.totalSongs,
            });
            // Phase 4: Create initial setlists
            await (0, import_status_1.updateImportStatus)(artist.id, {
                stage: "creating-setlists",
                progress: 95,
                message: "Creating initial setlists for upcoming shows",
            });
            const setlistsCreated = await this.createInitialSetlists(artist, showsResult.shows);
            // Final completion
            await job.updateProgress(100);
            await (0, import_status_1.updateImportStatus)(artist.id, {
                stage: "completed",
                progress: 100,
                message: "Import completed successfully",
                completed_at: new Date(),
            });
            const totalDuration = Date.now() - startTime;
            logger.success("Artist import completed", {
                artistId: artist.id,
                totalSongs: catalogResult.totalSongs,
                totalShows: showsResult.totalShows,
                totalVenues: showsResult.venuesCreated,
                setlistsCreated,
                duration: totalDuration,
                phaseTimings,
            });
            return {
                success: true,
                artistId: artist.id,
                slug: artist.slug,
                totalSongs: catalogResult.totalSongs,
                totalShows: showsResult.totalShows,
                totalVenues: showsResult.venuesCreated,
                importDuration: totalDuration,
                phaseTimings,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            logger.error("Artist import failed", {
                error: errorMessage,
                tmAttractionId,
                jobId: job.id,
            });
            if (artistId) {
                await (0, import_status_1.updateImportStatus)(artistId, {
                    stage: "failed",
                    progress: 0,
                    message: "Import failed",
                    error: errorMessage,
                });
            }
            throw error;
        }
    }
    static async executePhase1(tmAttractionId, job) {
        // Get artist data from Ticketmaster
        const tmArtist = await this.ticketmasterClient.getAttraction(tmAttractionId);
        if (!tmArtist) {
            throw new Error(`Artist not found in Ticketmaster: ${tmAttractionId}`);
        }
        await job.updateProgress(5);
        // Search for Spotify ID
        let spotifyId;
        let spotifyData = null;
        try {
            const searchResults = await this.spotifyClient.searchArtists(tmArtist.name, 5);
            if (searchResults.artists?.items?.length > 0) {
                // Find best match (exact name match or highest popularity)
                const exactMatch = searchResults.artists.items.find(artist => artist.name.toLowerCase() === tmArtist.name.toLowerCase());
                const selectedArtist = exactMatch || searchResults.artists.items[0];
                spotifyId = selectedArtist.id;
                spotifyData = selectedArtist;
                console.log(`✅ Found Spotify match: ${selectedArtist.name} (${spotifyId})`);
            }
        }
        catch (error) {
            console.warn("Failed to find Spotify ID:", error);
        }
        await job.updateProgress(10);
        // Generate unique slug
        const slug = await this.generateUniqueSlug(tmArtist.name);
        // Extract genres from Ticketmaster and Spotify
        const genres = [];
        // Add Ticketmaster genre
        if (tmArtist.classifications?.[0]?.genre?.name) {
            genres.push(tmArtist.classifications[0].genre.name);
        }
        // Add Spotify genres
        if (spotifyData?.genres) {
            genres.push(...spotifyData.genres);
        }
        // Remove duplicates and limit to top 5
        const uniqueGenres = [...new Set(genres)].slice(0, 5);
        // Create artist record
        const [artist] = await database_1.db
            .insert(database_1.artists)
            .values({
            tmAttractionId,
            spotifyId,
            name: tmArtist.name,
            slug,
            imageUrl: tmArtist.images?.[0]?.url || spotifyData?.images?.[0]?.url,
            smallImageUrl: tmArtist.images?.[1]?.url || spotifyData?.images?.[1]?.url,
            genres: JSON.stringify(uniqueGenres),
            popularity: spotifyData?.popularity || 0,
            followers: spotifyData?.followers?.total || 0,
            externalUrls: JSON.stringify({
                spotify: spotifyData?.external_urls?.spotify,
                ticketmaster: tmArtist.url,
            }),
            importStatus: "in_progress",
            verified: false,
        })
            .returning();
        await job.updateProgress(15);
        console.log(`✅ Phase 1 completed: Created artist ${artist.name} (${artist.id})`);
        return artist;
    }
    static async executePhase2(artist, job) {
        if (!artist.tmAttractionId) {
            return { totalShows: 0, venuesCreated: 0, shows: [] };
        }
        // Fetch events from Ticketmaster
        const events = await this.ticketmasterClient.getArtistEvents(artist.tmAttractionId);
        let totalShows = 0;
        let venuesCreated = 0;
        const createdShows = [];
        await job.updateProgress(25);
        // Process events in batches
        const batchSize = 10;
        for (let i = 0; i < events.length; i += batchSize) {
            const batch = events.slice(i, i + batchSize);
            for (const event of batch) {
                try {
                    // Create or find venue
                    let venueId = null;
                    if (event._embedded?.venues?.[0]) {
                        const venueData = event._embedded.venues[0];
                        // Check if venue exists
                        const existingVenue = await database_1.db
                            .select({ id: database_1.venues.id })
                            .from(database_1.venues)
                            .where((0, database_1.eq)(database_1.venues.tmVenueId, venueData.id))
                            .get();
                        if (existingVenue) {
                            venueId = existingVenue.id;
                        }
                        else {
                            // Create venue
                            const [newVenue] = await database_1.db
                                .insert(database_1.venues)
                                .values({
                                tmVenueId: venueData.id,
                                name: venueData.name,
                                address: venueData.address ? JSON.stringify(venueData.address) : null,
                                city: venueData.city?.name,
                                state: venueData.state?.name,
                                country: venueData.country?.name,
                                postalCode: venueData.postalCode,
                                timezone: venueData.timezone,
                                capacity: venueData.capacity,
                                imageUrl: venueData.images?.[0]?.url,
                            })
                                .returning();
                            venueId = newVenue.id;
                            venuesCreated++;
                        }
                    }
                    // Create show
                    const showSlug = this.generateShowSlug(artist.name, venueId || 'venue', event.dates?.start?.localDate);
                    const [show] = await database_1.db
                        .insert(database_1.shows)
                        .values({
                        headlinerArtistId: artist.id,
                        venueId,
                        name: event.name,
                        slug: showSlug,
                        date: event.dates?.start?.localDate,
                        startTime: event.dates?.start?.localTime,
                        doorsTime: event.dates?.start?.doorTime || null,
                        status: this.getShowStatus(event.dates?.start?.localDate),
                        description: event.info || null,
                        ticketUrl: event.url,
                        minPrice: event.priceRanges?.[0]?.min,
                        maxPrice: event.priceRanges?.[0]?.max,
                        currency: event.priceRanges?.[0]?.currency || "USD",
                        tmEventId: event.id,
                    })
                        .returning();
                    createdShows.push(show);
                    totalShows++;
                }
                catch (error) {
                    console.error(`Failed to create show for event ${event.id}:`, error);
                }
            }
            // Update progress
            const progress = 25 + Math.floor((i / events.length) * 35);
            await job.updateProgress(Math.min(progress, 60));
        }
        // Update artist with show counts
        await database_1.db
            .update(database_1.artists)
            .set({
            totalShows,
            upcomingShows: createdShows.filter(s => s.status === 'upcoming').length,
            showsSyncedAt: new Date(),
        })
            .where((0, database_1.eq)(database_1.artists.id, artist.id));
        console.log(`✅ Phase 2 completed: Created ${totalShows} shows and ${venuesCreated} venues`);
        return { totalShows, venuesCreated, shows: createdShows };
    }
    static async executePhase3(artist, job) {
        if (!artist.spotifyId) {
            console.log("⚠️ No Spotify ID, skipping song catalog sync");
            return { totalSongs: 0, totalAlbums: 0 };
        }
        await job.updateProgress(65);
        // Get artist's albums from Spotify
        const albums = await this.spotifyClient.getArtistAlbums(artist.spotifyId, {
            include_groups: 'album,single',
            market: 'US',
            limit: 50,
        });
        if (!albums || albums.length === 0) {
            return { totalSongs: 0, totalAlbums: 0 };
        }
        let totalSongs = 0;
        const totalAlbums = albums.length;
        const processedTracks = new Set(); // Track duplicates
        await job.updateProgress(70);
        // Process albums in batches
        const albumBatchSize = 5;
        for (let i = 0; i < albums.length; i += albumBatchSize) {
            const albumBatch = albums.slice(i, i + albumBatchSize);
            for (const album of albumBatch) {
                try {
                    // Get album tracks
                    const tracks = await this.spotifyClient.getAlbumTracks(album.id);
                    for (const track of tracks) {
                        // Skip if already processed (handles duplicates across albums)
                        if (processedTracks.has(track.id)) {
                            continue;
                        }
                        // Skip live versions for studio albums
                        if (this.isLiveTrack(track.name) && album.album_type === 'album') {
                            continue;
                        }
                        // Create song record
                        try {
                            const [song] = await database_1.db
                                .insert(database_1.songs)
                                .values({
                                spotifyId: track.id,
                                name: track.name,
                                artist: artist.name,
                                albumName: album.name,
                                albumId: album.id,
                                trackNumber: track.track_number,
                                discNumber: track.disc_number || 1,
                                albumType: album.album_type,
                                albumArtUrl: album.images?.[0]?.url,
                                releaseDate: album.release_date,
                                durationMs: track.duration_ms,
                                popularity: track.popularity || 0,
                                previewUrl: track.preview_url,
                                spotifyUri: track.uri,
                                externalUrls: JSON.stringify(track.external_urls),
                                isExplicit: track.explicit || false,
                                isPlayable: !track.restrictions,
                                isLive: this.isLiveTrack(track.name),
                                isRemix: this.isRemixTrack(track.name),
                            })
                                .returning();
                            // Link song to artist
                            await database_1.db
                                .insert(database_1.artistSongs)
                                .values({
                                artistId: artist.id,
                                songId: song.id,
                                isPrimaryArtist: true,
                            })
                                .onConflictDoNothing();
                            processedTracks.add(track.id);
                            totalSongs++;
                        }
                        catch (error) {
                            // Skip duplicate songs
                            if (!error.message?.includes('unique constraint')) {
                                console.error(`Failed to create song ${track.name}:`, error);
                            }
                        }
                    }
                }
                catch (error) {
                    console.error(`Failed to process album ${album.name}:`, error);
                }
            }
            // Update progress
            const progress = 70 + Math.floor((i / albums.length) * 20);
            await job.updateProgress(Math.min(progress, 90));
        }
        // Update artist with song catalog info
        await database_1.db
            .update(database_1.artists)
            .set({
            totalSongs,
            totalAlbums,
            songCatalogSyncedAt: new Date(),
            lastFullSyncAt: new Date(),
        })
            .where((0, database_1.eq)(database_1.artists.id, artist.id));
        console.log(`✅ Phase 3 completed: Imported ${totalSongs} songs from ${totalAlbums} albums`);
        return { totalSongs, totalAlbums };
    }
    static async createInitialSetlists(artist, shows) {
        // Only create setlists for upcoming shows
        const upcomingShows = shows.filter(show => show.status === 'upcoming');
        if (upcomingShows.length === 0) {
            return 0;
        }
        // Get artist's most popular songs for setlist creation
        const popularSongs = await database_1.db
            .select({
            id: database_1.songs.id,
            name: database_1.songs.name,
            popularity: database_1.songs.popularity,
        })
            .from(database_1.songs)
            .innerJoin(database_1.artistSongs, (0, database_1.eq)(database_1.songs.id, database_1.artistSongs.songId))
            .where((0, database_1.eq)(database_1.artistSongs.artistId, artist.id))
            .orderBy((0, database_1.desc)(database_1.songs.popularity))
            .limit(25);
        if (popularSongs.length === 0) {
            return 0;
        }
        let setlistsCreated = 0;
        for (const show of upcomingShows.slice(0, 10)) { // Limit to first 10 shows
            try {
                // Create predicted setlist
                const [setlist] = await database_1.db
                    .insert(database_1.setlists)
                    .values({
                    showId: show.id,
                    artistId: artist.id,
                    type: "predicted",
                    name: "Main Set",
                    orderIndex: 0,
                    isLocked: false,
                    importedFrom: "auto-generated",
                })
                    .returning();
                // Add songs to setlist (top 15-20 songs)
                const setlistSongs = popularSongs.slice(0, Math.min(18, popularSongs.length));
                for (let i = 0; i < setlistSongs.length; i++) {
                    await database_1.db
                        .insert(setlistSongs)
                        .values({
                        setlistId: setlist.id,
                        songId: setlistSongs[i].id,
                        position: i + 1,
                    });
                }
                setlistsCreated++;
            }
            catch (error) {
                console.error(`Failed to create setlist for show ${show.id}:`, error);
            }
        }
        return setlistsCreated;
    }
    // Utility methods
    static async generateUniqueSlug(name) {
        const baseSlug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        let slug = baseSlug;
        let counter = 1;
        while (true) {
            const existing = await database_1.db
                .select({ id: database_1.artists.id })
                .from(database_1.artists)
                .where((0, database_1.eq)(database_1.artists.slug, slug))
                .get();
            if (!existing) {
                return slug;
            }
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
    }
    static generateShowSlug(artistName, venueId, date) {
        const artistSlug = artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const dateSlug = date ? date.replace(/-/g, '') : 'tbd';
        const venueSlug = venueId.slice(-6); // Last 6 chars of venue ID
        return `${artistSlug}-${venueSlug}-${dateSlug}`;
    }
    static getShowStatus(date) {
        if (!date)
            return "upcoming";
        const showDate = new Date(date);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (showDate < today)
            return "completed";
        return "upcoming";
    }
    static isLiveTrack(name) {
        const liveKeywords = [/\blive\b/i, /\bconcert\b/i, /\btour\b/i, /\bshow\b/i];
        return liveKeywords.some(pattern => pattern.test(name));
    }
    static isRemixTrack(name) {
        const remixKeywords = [/\bremix\b/i, /\bedit\b/i, /\brework\b/i];
        return remixKeywords.some(pattern => pattern.test(name));
    }
}
exports.ArtistImportProcessor = ArtistImportProcessor;
exports.default = ArtistImportProcessor;
