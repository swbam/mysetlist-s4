"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetlistSyncService = void 0;
const database_1 = require("@repo/database");
const setlistfm_1 = require("../clients/setlistfm");
const spotify_1 = require("../clients/spotify");
const database_2 = require("@repo/database");
class SetlistSyncService {
    setlistFmClient;
    spotifyClient;
    constructor() {
        this.setlistFmClient = new setlistfm_1.SetlistFmClient({
            apiKey: process.env["SETLISTFM_API_KEY"],
        });
        this.spotifyClient = new spotify_1.SpotifyClient({});
    }
    async syncSetlistFromSetlistFm(setlistData) {
        await this.spotifyClient.authenticate();
        // Find or create artist
        let [artist] = await database_2.db
            .select()
            .from(database_1.artists)
            .where((0, database_2.eq)(database_1.artists.name, setlistData.artist.name))
            .limit(1);
        if (!artist) {
            // Create artist if doesn't exist
            const slug = setlistData.artist.name.toLowerCase().replace(/\s+/g, "-");
            const [newArtist] = await database_2.db
                .insert(database_1.artists)
                .values({
                name: setlistData.artist.name,
                slug,
                mbid: setlistData.artist.mbid || null,
            })
                .returning();
            artist = newArtist;
            if (!artist)
                return;
        }
        // Find or create venue
        let venue = null;
        if (setlistData.venue) {
            const [existingVenue] = await database_2.db
                .select()
                .from(database_1.venues)
                .where((0, database_2.and)((0, database_2.eq)(database_1.venues.name, setlistData.venue.name), (0, database_2.eq)(database_1.venues.city, setlistData.venue.city.name)))
                .limit(1);
            if (existingVenue) {
                venue = existingVenue;
            }
            else {
                // Determine timezone based on country/state (basic mapping, can be improved)
                let timezone = "America/New_York"; // Default
                const country = setlistData.venue.city.country.code;
                const state = setlistData.venue.city.stateCode;
                if (country === "US") {
                    // Basic US timezone mapping
                    if (["CA", "WA", "OR", "NV"].includes(state || "")) {
                        timezone = "America/Los_Angeles";
                    }
                    else if (["AZ", "UT", "CO", "NM", "WY", "ID", "MT"].includes(state || "")) {
                        timezone = "America/Denver";
                    }
                    else if ([
                        "TX",
                        "OK",
                        "AR",
                        "LA",
                        "MN",
                        "IA",
                        "WI",
                        "IL",
                        "MO",
                        "KS",
                        "NE",
                        "SD",
                        "ND",
                    ].includes(state || "")) {
                        timezone = "America/Chicago";
                    }
                }
                else if (country === "GB") {
                    timezone = "Europe/London";
                }
                else if (country === "DE") {
                    timezone = "Europe/Berlin";
                }
                else if (country === "FR") {
                    timezone = "Europe/Paris";
                }
                else if (country === "JP") {
                    timezone = "Asia/Tokyo";
                }
                else if (country === "AU") {
                    timezone = "Australia/Sydney";
                }
                const [newVenue] = await database_2.db
                    .insert(database_1.venues)
                    .values({
                    name: setlistData.venue.name,
                    slug: setlistData.venue.name.toLowerCase().replace(/\s+/g, "-"),
                    city: setlistData.venue.city.name,
                    state: setlistData.venue.city.stateCode || null,
                    country: setlistData.venue.city.country.code,
                    latitude: null,
                    longitude: null,
                    timezone: timezone,
                })
                    .returning();
                venue = newVenue || null;
            }
        }
        // Find or create show
        const showDate = setlistData.eventDate.split("-").reverse().join("-"); // Convert DD-MM-YYYY to YYYY-MM-DD
        let [show] = await database_2.db
            .select()
            .from(database_1.shows)
            .where((0, database_2.and)((0, database_2.eq)(database_1.shows.headlinerArtistId, artist.id), (0, database_2.eq)(database_1.shows.date, showDate)))
            .limit(1);
        if (!show) {
            const [newShow] = await database_2.db
                .insert(database_1.shows)
                .values({
                headlinerArtistId: artist.id,
                venueId: venue?.id || null,
                name: `${artist.name} at ${setlistData.venue?.name || "Unknown Venue"}`,
                slug: `${artist.slug}-${showDate}`,
                date: showDate,
                status: new Date(showDate) < new Date() ? "completed" : "upcoming",
                setlistFmId: setlistData.id,
            })
                .returning();
            show = newShow;
        }
        else {
            // Update show with setlistFM ID if missing
            if (!show.setlistFmId) {
                await database_2.db
                    .update(database_1.shows)
                    .set({
                    setlistFmId: setlistData.id,
                    updatedAt: new Date(),
                })
                    .where((0, database_2.eq)(database_1.shows.id, show.id));
            }
        }
        if (!show)
            return;
        // Check if setlist already exists
        const [existingSetlist] = await database_2.db
            .select()
            .from(database_1.setlists)
            .where((0, database_2.eq)(database_1.setlists.showId, show.id))
            .limit(1);
        if (existingSetlist) {
            return; // Setlist already synced
        }
        // Create setlist using raw SQL to avoid moderation_status issue
        const setlistResult = await database_2.db.execute((0, database_2.sql) `
      INSERT INTO setlists (show_id, artist_id, type, name, imported_from, external_id, imported_at)
      VALUES (${show.id}, ${artist.id}, 'actual', 'Main Set', 'setlist.fm', ${setlistData.id}, NOW())
      RETURNING id
    `);
        const setlist = setlistResult[0];
        if (!setlist) {
            return;
        }
        // Process all sets
        let songOrder = 0;
        for (const set of setlistData.sets.set) {
            const songs = await this.processSongsFromSet(set, artist.id, artist.spotifyId);
            // Add songs to setlist
            for (const song of songs) {
                await database_2.db
                    .insert(database_1.setlistSongs)
                    .values({
                    setlistId: setlist.id,
                    songId: song.id,
                    position: songOrder++,
                    notes: song.info || null,
                })
                    .onConflictDoNothing();
            }
        }
        // Update show setlist count
        await database_2.db
            .update(database_1.shows)
            .set({
            setlistCount: (show.setlistCount || 0) + 1,
            updatedAt: new Date(),
        })
            .where((0, database_2.eq)(database_1.shows.id, show.id));
    }
    async processSongsFromSet(set, artistId, artistSpotifyId) {
        const processedSongs = [];
        for (const songData of set.song) {
            try {
                // Check if song already exists
                const songResults = await database_2.db
                    .select({ id: database_1.songs.id })
                    .from(database_1.songs)
                    .where((0, database_2.and)((0, database_2.eq)(database_1.songs.name, songData.name), (0, database_2.eq)(database_1.songs.artist, songData.cover?.name || artistId)))
                    .limit(1);
                let song = songResults[0];
                if (!song && artistSpotifyId) {
                    // Try to find song on Spotify
                    try {
                        const searchQuery = `track:"${songData.name}" artist:"${songData.cover?.name || artistId}"`;
                        const searchResult = await this.spotifyClient.searchArtists(searchQuery, 1);
                        if (searchResult.artists.items.length > 0) {
                            const track = searchResult.artists.items[0];
                            if (track) {
                                // Create song handling duplicate Spotify IDs
                                try {
                                    const [newSong] = await database_2.db
                                        .insert(database_1.songs)
                                        .values({
                                        spotifyId: track.id,
                                        name: track.name,
                                        artist: track.name,
                                        albumName: "Unknown Album",
                                        albumArtUrl: null,
                                        releaseDate: new Date().toISOString(),
                                        durationMs: 0,
                                        popularity: 0,
                                        previewUrl: null,
                                        isExplicit: false,
                                        isPlayable: true,
                                    })
                                        .onConflictDoNothing()
                                        .returning({ id: database_1.songs.id });
                                    if (newSong) {
                                        song = newSong;
                                        // Add to artist_songs junction
                                        await database_2.db
                                            .insert(database_1.artistSongs)
                                            .values({
                                            artistId: artistId,
                                            songId: newSong.id,
                                        })
                                            .onConflictDoNothing();
                                    }
                                }
                                catch (error) {
                                    // If Spotify ID conflict, create without it
                                    const [newSong] = await database_2.db
                                        .insert(database_1.songs)
                                        .values({
                                        name: track.name,
                                        artist: track.name,
                                        albumName: "Unknown Album",
                                        albumArtUrl: null,
                                        durationMs: 0,
                                        popularity: 0,
                                        previewUrl: null,
                                    })
                                        .returning({ id: database_1.songs.id });
                                    if (newSong) {
                                        song = newSong;
                                    }
                                }
                            }
                        }
                    }
                    catch (_error) { }
                }
                if (!song) {
                    // Create a basic song entry without Spotify data
                    const [newSong] = await database_2.db
                        .insert(database_1.songs)
                        .values({
                        name: songData.name,
                        artist: songData.cover?.name || artistId,
                    })
                        .returning({ id: database_1.songs.id });
                    if (newSong) {
                        song = newSong;
                        // Add to artist_songs junction
                        await database_2.db
                            .insert(database_1.artistSongs)
                            .values({
                            artistId: artistId,
                            songId: newSong.id,
                        })
                            .onConflictDoNothing();
                    }
                }
                if (song) {
                    processedSongs.push({
                        id: song.id,
                        info: songData.info,
                    });
                }
            }
            catch (_error) { }
        }
        return processedSongs;
    }
    async createDefaultSetlists(artistId) {
        // Get all upcoming shows for this artist without an existing setlist
        const upcomingShows = await database_2.db
            .select()
            .from(database_1.shows)
            .where((0, database_2.and)((0, database_2.eq)(database_1.shows.headlinerArtistId, artistId), (0, database_2.sql) `${database_1.shows.date} >= CURRENT_DATE`));
        let createdSetlists = 0;
        for (const show of upcomingShows) {
            // Skip if setlist already exists
            const existingSetlist = await database_2.db
                .select()
                .from(database_1.setlists)
                .where((0, database_2.eq)(database_1.setlists.showId, show.id))
                .limit(1);
            if (existingSetlist.length > 0) {
                continue;
            }
            // Get non-live songs from catalog and pick 5 random
            const catalog = await database_2.db
                .select({
                id: database_1.songs.id,
                title: database_1.songs.name,
                popularity: database_1.songs.popularity,
            })
                .from(database_1.songs)
                .innerJoin(database_1.artistSongs, (0, database_2.eq)(database_1.songs.id, database_1.artistSongs.songId))
                .where((0, database_2.eq)(database_1.artistSongs.artistId, artistId));
            const nonLive = catalog.filter((s) => {
                const name = (s.title || "").toLowerCase();
                return !(name.includes("(live") ||
                    name.includes(" - live") ||
                    name.includes(" live") ||
                    name.includes(" - live at") ||
                    name.includes(" (live at") ||
                    name.includes("[live]"));
            });
            if (nonLive.length === 0)
                continue;
            // Shuffle and take 5 (optionally weight by popularity by partial sort)
            nonLive.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
            const topPool = nonLive.slice(0, Math.min(25, nonLive.length));
            for (let i = topPool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = topPool[i];
                topPool[i] = topPool[j];
                topPool[j] = tmp;
            }
            const selected = topPool.slice(0, Math.min(5, topPool.length));
            // Create predicted setlist
            const result = await database_2.db
                .insert(database_1.setlists)
                .values({
                showId: show.id,
                artistId: artistId,
                type: "predicted",
                name: "Predicted Setlist",
                orderIndex: 0,
                isLocked: false,
                importedFrom: "api",
            })
                .returning();
            const setlist = result[0];
            if (!setlist)
                continue;
            // Add songs to setlist
            for (let i = 0; i < selected.length; i++) {
                const song = selected[i];
                if (!song?.id)
                    continue; // Skip if song or id is undefined
                await database_2.db
                    .insert(database_1.setlistSongs)
                    .values({
                    setlistId: setlist.id,
                    songId: song.id,
                    position: i + 1,
                    notes: null,
                    isPlayed: null,
                })
                    .onConflictDoNothing();
            }
            createdSetlists++;
        }
        return {
            upcomingShows: upcomingShows.length,
            createdSetlists,
            skipped: upcomingShows.length - createdSetlists,
        };
    }
    /**
     * Ensures initial setlists exist for new shows
     * Creates 5-song initial setlist with songs randomly selected from artist's non-live catalog
     * Optionally weights by popularity
     */
    async ensureInitialSetlists(showId, options = {}) {
        const { songCount = 5, weightByPopularity = true, excludeLive = true, } = options;
        // Get show details
        const [show] = await database_2.db
            .select()
            .from(database_1.shows)
            .where((0, database_2.eq)(database_1.shows.id, showId))
            .limit(1);
        if (!show) {
            throw new Error(`Show not found: ${showId}`);
        }
        // Check if setlist already exists
        const existingSetlist = await database_2.db
            .select()
            .from(database_1.setlists)
            .where((0, database_2.eq)(database_1.setlists.showId, showId))
            .limit(1);
        if (existingSetlist.length > 0) {
            return { created: false, songCount: 0, skippedLive: 0 };
        }
        // Get artist's catalog
        let songQuery = database_2.db
            .select({
            id: database_1.songs.id,
            title: database_1.songs.name,
            artist: database_1.songs.artist,
            albumName: database_1.songs.albumName,
            popularity: database_1.songs.popularity,
            durationMs: database_1.songs.durationMs,
            albumType: database_1.songs.albumType,
        })
            .from(database_1.songs)
            .innerJoin(database_1.artistSongs, (0, database_2.eq)(database_1.songs.id, database_1.artistSongs.songId))
            .where((0, database_2.eq)(database_1.artistSongs.artistId, show.headlinerArtistId));
        // Apply ordering based on options
        // Apply ordering based on options (cast to any to avoid narrowed builder issues)
        if (weightByPopularity) {
            songQuery = songQuery.orderBy((0, database_2.sql) `${database_1.songs.popularity} DESC NULLS LAST, RANDOM()`);
        }
        else {
            songQuery = songQuery.orderBy((0, database_2.sql) `RANDOM()`);
        }
        const availableSongs = await songQuery.limit(50); // Get more than we need for filtering
        // Filter out live tracks if requested
        let filteredSongs = availableSongs;
        let skippedLive = 0;
        if (excludeLive) {
            filteredSongs = availableSongs.filter((song) => {
                const isLive = this.isLiveTrack(song.title.toLowerCase(), song.album?.toLowerCase() || "");
                if (isLive)
                    skippedLive++;
                return !isLive;
            });
        }
        if (filteredSongs.length === 0) {
            return { created: false, songCount: 0, skippedLive };
        }
        // Select the requested number of songs
        const selectedSongs = filteredSongs.slice(0, Math.min(songCount, filteredSongs.length));
        // Create predicted setlist
        const [setlist] = await database_2.db
            .insert(database_1.setlists)
            .values({
            showId: showId,
            artistId: show.headlinerArtistId,
            type: "predicted",
            name: "Predicted Setlist",
            orderIndex: 0,
            isLocked: false,
            importedFrom: "api",
        })
            .returning();
        if (!setlist) {
            throw new Error("Failed to create setlist");
        }
        // Add songs to setlist
        for (let i = 0; i < selectedSongs.length; i++) {
            const song = selectedSongs[i];
            if (!song?.id)
                continue;
            await database_2.db.insert(database_1.setlistSongs).values({
                setlistId: setlist.id,
                songId: song.id,
                position: i + 1,
                notes: null,
                isPlayed: null, // Not applicable for predicted setlists
            });
        }
        return {
            created: true,
            songCount: selectedSongs.length,
            skippedLive,
        };
    }
    /**
     * Checks if a track is likely a live recording
     */
    isLiveTrack(trackTitle, albumName) {
        const liveIndicators = [
            "live at",
            "live from",
            "live in",
            "live on",
            "- live",
            "(live)",
            "[live]",
            "live version",
            "live recording",
            "concert",
            "acoustic session",
            "unplugged",
            "mtv unplugged",
            "radio session",
            "bbc session",
            "peel session",
        ];
        const combinedText = `${trackTitle} ${albumName}`;
        return liveIndicators.some((indicator) => combinedText.includes(indicator));
    }
    async syncSetlistByShowId(showId) {
        const showResults = await database_2.db
            .select()
            .from(database_1.shows)
            .where((0, database_2.eq)(database_1.shows.id, showId))
            .limit(1);
        const show = showResults[0];
        if (!show) {
            throw new Error(`Show not found: ${showId}`);
        }
        // Get the headliner artist
        const headlinerResults = await database_2.db
            .select()
            .from(database_1.artists)
            .where((0, database_2.eq)(database_1.artists.id, show.headlinerArtistId))
            .limit(1);
        const headlinerArtist = headlinerResults[0];
        // Get the venue if it exists
        let venue = null;
        if (show.venueId) {
            const venueResults = await database_2.db
                .select()
                .from(database_1.venues)
                .where((0, database_2.eq)(database_1.venues.id, show.venueId))
                .limit(1);
            venue = venueResults[0] || null;
        }
        if (!headlinerArtist) {
            throw new Error(`Headliner artist not found for show: ${showId}`);
        }
        // Search for setlist on Setlist.fm
        const searchParams = {
            artistName: headlinerArtist.name,
            date: show.date,
        };
        if (venue?.name) {
            searchParams.venueName = venue.name;
        }
        const searchResult = await this.setlistFmClient.searchSetlists(searchParams);
        if (searchResult.setlist.length > 0) {
            // Use the first matching setlist
            const setlistData = searchResult.setlist[0];
            if (setlistData) {
                // Update show with setlist.fm ID
                await database_2.db
                    .update(database_1.shows)
                    .set({
                    setlistFmId: setlistData.id,
                    updatedAt: new Date(),
                })
                    .where((0, database_2.eq)(database_1.shows.id, showId));
                // Sync the setlist
                await this.syncSetlistFromSetlistFm(setlistData);
            }
        }
    }
}
exports.SetlistSyncService = SetlistSyncService;
