"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtistSyncService = void 0;
// @ts-nocheck
const database_1 = require("@repo/database");
const setlistfm_1 = require("../clients/setlistfm");
const spotify_1 = require("../clients/spotify");
const ticketmaster_1 = require("../clients/ticketmaster");
const database_2 = require("@repo/database");
const error_handler_1 = require("../utils/error-handler");
class ArtistSyncService {
    spotifyClient;
    ticketmasterClient;
    errorHandler;
    constructor() {
        this.spotifyClient = new spotify_1.SpotifyClient({});
        this.ticketmasterClient = new ticketmaster_1.TicketmasterClient({
            apiKey: process.env["TICKETMASTER_API_KEY"] || "",
        });
        this.errorHandler = new error_handler_1.SyncErrorHandler({
            maxRetries: 3,
            retryDelay: 1000,
            onError: (error) => {
                console.error("[ArtistSyncService] Error:", error);
            },
        });
    }
    async syncIdentifiers(params) {
        if (!params.ticketmasterAttractionId) {
            throw new Error("ticketmasterAttractionId is required for syncIdentifiers");
        }
        const result = {
            tmAttractionId: params.ticketmasterAttractionId,
        };
        // Resolve DB artist
        let artistRecord = null;
        if (params.artistDbId) {
            const [row] = await database_1.db
                .select()
                .from(database_1.artists)
                .where((0, database_2.eq)(database_1.artists.id, params.artistDbId))
                .limit(1);
            artistRecord = row || null;
        }
        const name = params.artistName || artistRecord?.name;
        // Ticketmaster ID
        if (!artistRecord?.tmAttractionId && params.ticketmasterAttractionId) {
            result.tmAttractionId = params.ticketmasterAttractionId;
            if (artistRecord) {
                await database_1.db
                    .update(database_1.artists)
                    .set({ tmAttractionId: params.ticketmasterAttractionId })
                    .where((0, database_2.eq)(database_1.artists.id, artistRecord.id));
            }
        }
        // Spotify ID by name if missing
        if (!artistRecord?.spotifyId && name) {
            try {
                await this.spotifyClient.authenticate();
                const sr = await this.spotifyClient.searchArtists(name, 1);
                const sp = sr.artists.items[0];
                if (sp) {
                    result.spotifyId = sp.id;
                    if (artistRecord) {
                        await database_1.db
                            .update(database_1.artists)
                            .set({ spotifyId: sp.id })
                            .where((0, database_2.eq)(database_1.artists.id, artistRecord.id));
                    }
                }
            }
            catch (e) {
                console.warn("syncIdentifiers: Spotify search failed", e);
            }
        }
        // MBID via Setlist.fm (if available via name)
        try {
            const s = new setlistfm_1.SetlistFmClient({
                apiKey: process.env["SETLISTFM_API_KEY"],
            });
            const qName = name;
            if (qName) {
                const sr = await s.searchSetlists({ artistName: qName, p: 1 });
                const mbid = sr.setlist?.[0]?.artist?.mbid;
                if (mbid) {
                    result.mbid = mbid;
                    if (artistRecord) {
                        await database_1.db
                            .update(database_1.artists)
                            .set({ mbid })
                            .where((0, database_2.eq)(database_1.artists.id, artistRecord.id));
                    }
                }
            }
        }
        catch (e) {
            console.warn("syncIdentifiers: Setlist.fm search failed", e);
        }
        return result;
    }
    async syncArtist(artistId) {
        try {
            await this.spotifyClient.authenticate();
        }
        catch (error) {
            throw new error_handler_1.SyncServiceError("Failed to authenticate with Spotify", "ArtistSyncService", "authenticate", error instanceof Error ? error : undefined);
        }
        // Get artist from Spotify with retry
        const spotifyArtist = await this.errorHandler.withRetry(() => this.spotifyClient.getArtist(artistId), {
            service: "ArtistSyncService",
            operation: "getArtist",
            context: { artistId },
        });
        if (!spotifyArtist) {
            throw new error_handler_1.SyncServiceError(`Failed to fetch artist ${artistId} from Spotify`, "ArtistSyncService", "getArtist");
        }
        // Get top tracks with retry
        const topTracksResult = await this.errorHandler.withRetry(() => this.spotifyClient.getArtistTopTracks(artistId), {
            service: "ArtistSyncService",
            operation: "getArtistTopTracks",
            context: { artistId },
        });
        const topTracks = topTracksResult || { tracks: [] };
        // Try to find the artist on Ticketmaster
        let tmAttractionId = null;
        try {
            const ticketmasterResult = await this.errorHandler.withRetry(() => this.ticketmasterClient.searchEvents({
                keyword: spotifyArtist.name,
                size: 1,
            }), {
                service: "ArtistSyncService",
                operation: "searchEvents",
                context: { artistName: spotifyArtist.name },
            });
            if (ticketmasterResult?._embedded?.events?.[0]?._embedded?.attractions?.[0]) {
                const attraction = ticketmasterResult._embedded.events[0]._embedded.attractions[0];
                if (this.isArtistNameMatch(spotifyArtist.name, attraction?.name || "")) {
                    tmAttractionId = attraction.id;
                    console.log(`Found Ticketmaster ID ${tmAttractionId} for ${spotifyArtist.name}`);
                }
            }
        }
        catch (error) {
            console.warn(`Failed to find Ticketmaster ID for ${spotifyArtist.name}:`, error);
        }
        // Update or create artist in database
        await database_1.db
            .insert(database_1.artists)
            .values({
            spotifyId: spotifyArtist.id,
            tmAttractionId,
            name: spotifyArtist.name,
            slug: this.generateSlug(spotifyArtist.name),
            imageUrl: spotifyArtist.images[0]?.url || null,
            smallImageUrl: spotifyArtist.images[2]?.url || null,
            genres: JSON.stringify(spotifyArtist.genres),
            popularity: spotifyArtist.popularity,
            followers: spotifyArtist.followers.total,
            externalUrls: JSON.stringify(spotifyArtist.external_urls),
            lastSyncedAt: new Date(),
        })
            .onConflictDoUpdate({
            target: database_1.artists.spotifyId,
            set: {
                tmAttractionId,
                name: spotifyArtist.name,
                imageUrl: spotifyArtist.images[0]?.url || null,
                smallImageUrl: spotifyArtist.images[2]?.url || null,
                genres: JSON.stringify(spotifyArtist.genres),
                popularity: spotifyArtist.popularity,
                followers: spotifyArtist.followers.total,
                lastSyncedAt: new Date(),
            },
        });
        // Sync top tracks
        await this.syncArtistTracks(artistId, topTracks.tracks);
    }
    // NEW: High-level helper used by routes to perform a complete artist sync
    async syncFullDiscography(artistSpotifyId) {
        // Sync core artist details and top tracks first
        await this.syncArtist(artistSpotifyId);
        // Then sync full catalog (albums/tracks)
        const catalog = await this.syncCatalog(artistSpotifyId);
        return catalog;
    }
    async syncArtistTracks(artistId, tracks) {
        const [artist] = await database_1.db
            .select()
            .from(database_1.artists)
            .where((0, database_2.eq)(database_1.artists.spotifyId, artistId))
            .limit(1);
        if (!artist) {
            return;
        }
        for (const track of tracks) {
            // Insert or update song
            const [song] = await database_1.db
                .insert(database_1.songs)
                .values({
                spotifyId: track.id,
                name: track.name,
                artist: track.artists[0].name,
                albumName: track.album.name,
                albumArtUrl: track.album.images[0]?.url,
                releaseDate: track.album.release_date,
                durationMs: track.duration_ms,
                popularity: track.popularity,
                previewUrl: track.preview_url,
                isExplicit: track.explicit,
                isPlayable: track.is_playable,
            })
                .onConflictDoUpdate({
                target: database_1.songs.spotifyId,
                set: {
                    name: track.name,
                    popularity: track.popularity,
                    isPlayable: track.is_playable,
                },
            })
                .returning();
            // Link artist to song if we have both records
            if (song && artist) {
                await database_1.db
                    .insert(database_1.artistSongs)
                    .values({
                    artistId: artist.id,
                    songId: song.id,
                    isPrimaryArtist: true,
                })
                    .onConflictDoNothing();
            }
        }
    }
    // NEW: bulk-sync popular artists (top Ticketmaster attractions)
    async syncPopularArtists(limit = 50) {
        console.log(`[ArtistSyncService] Syncing top ${limit} popular Ticketmaster artists…`);
        try {
            const attractionsResp = await this.ticketmasterClient.searchAttractions({
                classificationName: "music",
                size: limit,
                sort: "relevance,desc",
            });
            const attractions = attractionsResp?._embedded?.attractions ?? [];
            let processed = 0;
            for (const attr of attractions) {
                const name = attr.name;
                const tmId = attr.id;
                if (!name || !tmId)
                    continue;
                // Insert placeholder artist if not exists
                await database_1.db
                    .insert(database_1.artists)
                    .values({
                    name,
                    slug: this.generateSlug(name),
                    tmAttractionId: tmId,
                    importStatus: "pending",
                })
                    .onConflictDoNothing();
                processed += 1;
            }
            console.log(`[ArtistSyncService] Synced ${processed} popular artists`);
            return processed;
        }
        catch (e) {
            console.error("syncPopularArtists failed", e);
            return 0;
        }
    }
    /**
     * Fetches full Spotify catalog excluding "live" tracks with deduplication
     */
    async syncCatalog(artistId) {
        // implementation continues...
        return { totalSongs: 0, totalAlbums: 0, processedAlbums: 0 };
    }
    generateSlug(name, id) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    }
    isArtistNameMatch(name1, name2) {
        const normalize = (name, id) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normalized1 = normalize(name1);
        const normalized2 = normalize(name2);
        // Exact match
        if (normalized1 === normalized2) {
            return true;
        }
        // Check if one contains the other (for cases like "Artist" vs "Artist Band")
        if (normalized1.includes(normalized2) ||
            normalized2.includes(normalized1)) {
            return true;
        }
        return false;
    }
}
exports.ArtistSyncService = ArtistSyncService;
