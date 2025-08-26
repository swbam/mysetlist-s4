"use strict";
// MySetlist-S4 Spotify Sync Processor
// File: apps/web/lib/queues/processors/spotify-sync.processor.ts
// NEW FILE - Handles Spotify data synchronization jobs
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpotifySyncProcessor = void 0;
const database_1 = require("@repo/database");
const external_apis_1 = require("@repo/external-apis");
const import_logger_1 = require("~/lib/import-logger");
const circuit_breaker_1 = require("~/lib/circuit-breaker");
class SpotifySyncProcessor {
    static spotifyClient = new external_apis_1.SpotifyClient();
    static async process(job) {
        const { artistId, spotifyId, syncType, options = {} } = job.data;
        const logger = new import_logger_1.ImportLogger(job.id || "spotify-sync");
        const startTime = Date.now();
        const result = {
            success: false,
            artistId,
            syncType,
            songsUpdated: 0,
            albumsProcessed: 0,
            errors: [],
            duration: 0,
        };
        try {
            logger.info(`Starting Spotify sync: ${syncType}`, {
                artistId,
                spotifyId,
                options,
            });
            await job.updateProgress(0);
            // Verify artist exists
            const artist = await database_1.db
                .select()
                .from(database_1.artists)
                .where((0, database_1.eq)(database_1.artists.id, artistId))
                .get();
            if (!artist) {
                throw new Error(`Artist not found: ${artistId}`);
            }
            // Execute sync based on type
            switch (syncType) {
                case 'profile':
                    await this.syncArtistProfile(artist, spotifyId, job, result);
                    break;
                case 'albums':
                    await this.syncArtistAlbums(artist, spotifyId, job, result, options);
                    break;
                case 'tracks':
                    await this.syncArtistTopTracks(artist, spotifyId, job, result);
                    break;
                case 'full':
                    await this.syncFullCatalog(artist, spotifyId, job, result, options);
                    break;
                default:
                    throw new Error(`Unknown sync type: ${syncType}`);
            }
            await job.updateProgress(100);
            result.success = true;
            result.duration = Date.now() - startTime;
            logger.success(`Spotify sync completed: ${syncType}`, {
                artistId,
                songsUpdated: result.songsUpdated,
                albumsProcessed: result.albumsProcessed,
                duration: result.duration,
            });
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            result.errors.push(errorMessage);
            result.duration = Date.now() - startTime;
            logger.error(`Spotify sync failed: ${syncType}`, {
                error: errorMessage,
                artistId,
                spotifyId,
            });
            throw error;
        }
    }
    static async syncArtistProfile(artist, spotifyId, job, result) {
        await job.updateProgress(10);
        // Get updated artist info from Spotify
        const spotifyArtist = await circuit_breaker_1.circuitBreaker.execute(async () => this.spotifyClient.getArtist(spotifyId));
        if (!spotifyArtist) {
            throw new Error(`Artist not found on Spotify: ${spotifyId}`);
        }
        await job.updateProgress(50);
        // Update artist record with fresh Spotify data
        await database_1.db
            .update(database_1.artists)
            .set({
            name: spotifyArtist.name,
            imageUrl: spotifyArtist.images?.[0]?.url || artist.imageUrl,
            smallImageUrl: spotifyArtist.images?.[1]?.url || artist.smallImageUrl,
            genres: JSON.stringify(spotifyArtist.genres || []),
            popularity: spotifyArtist.popularity || 0,
            followers: spotifyArtist.followers?.total || 0,
            monthlyListeners: null, // Would need Spotify Web API for this
            externalUrls: JSON.stringify({
                ...(artist.externalUrls ? JSON.parse(artist.externalUrls) : {}),
                spotify: spotifyArtist.external_urls?.spotify,
            }),
            lastSyncedAt: new Date(),
        })
            .where((0, database_1.eq)(database_1.artists.id, artist.id));
        await job.updateProgress(100);
    }
    static async syncArtistAlbums(artist, spotifyId, job, result, options) {
        await job.updateProgress(5);
        // Get artist's albums
        const includeGroups = ['album', 'single'];
        if (options.includeCompilations)
            includeGroups.push('compilation');
        if (options.includeAppearsOn)
            includeGroups.push('appears_on');
        const albums = await circuit_breaker_1.circuitBreaker.execute(async () => this.spotifyClient.getArtistAlbums(spotifyId, {
            include_groups: includeGroups.join(','),
            market: 'US',
            limit: 50,
        }));
        if (!albums || albums.length === 0) {
            return;
        }
        await job.updateProgress(20);
        // Get existing songs to avoid duplicates
        const existingSongs = await database_1.db
            .select({
            spotifyId: database_1.songs.spotifyId,
            id: database_1.songs.id,
        })
            .from(database_1.songs)
            .innerJoin(database_1.artistSongs, (0, database_1.eq)(database_1.songs.id, database_1.artistSongs.songId))
            .where((0, database_1.eq)(database_1.artistSongs.artistId, artist.id));
        const existingSpotifyIds = new Set(existingSongs.map(s => s.spotifyId).filter(Boolean));
        await job.updateProgress(30);
        let songsProcessed = 0;
        const albumBatchSize = 5;
        // Process albums in batches
        for (let i = 0; i < albums.length; i += albumBatchSize) {
            const albumBatch = albums.slice(i, i + albumBatchSize);
            for (const album of albumBatch) {
                try {
                    // Get album tracks
                    const tracks = await circuit_breaker_1.circuitBreaker.execute(async () => this.spotifyClient.getAlbumTracks(album.id));
                    for (const track of tracks) {
                        // Skip if already exists
                        if (existingSpotifyIds.has(track.id)) {
                            continue;
                        }
                        // Skip live tracks if option is set
                        if (options.skipLive && this.isLiveTrack(track.name)) {
                            continue;
                        }
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
                                previewUrl: track.preview_url,
                                spotifyUri: track.uri,
                                externalUrls: JSON.stringify(track.external_urls),
                                isExplicit: track.explicit || false,
                                isPlayable: !track.restrictions,
                                isLive: this.isLiveTrack(track.name),
                                isRemix: this.isRemixTrack(track.name),
                            })
                                .returning();
                            // Link to artist
                            await database_1.db
                                .insert(database_1.artistSongs)
                                .values({
                                artistId: artist.id,
                                songId: song.id,
                                isPrimaryArtist: true,
                            })
                                .onConflictDoNothing();
                            songsProcessed++;
                            result.songsUpdated++;
                        }
                        catch (error) {
                            if (!error.message?.includes('unique constraint')) {
                                result.errors.push(`Failed to create song ${track.name}: ${error.message}`);
                            }
                        }
                    }
                    result.albumsProcessed++;
                }
                catch (error) {
                    result.errors.push(`Failed to process album ${album.name}: ${error.message}`);
                }
            }
            // Update progress
            const progress = 30 + Math.floor((i / albums.length) * 60);
            await job.updateProgress(Math.min(progress, 90));
        }
        // Update artist stats
        await this.updateArtistSongStats(artist.id);
        await job.updateProgress(100);
    }
    static async syncArtistTopTracks(artist, spotifyId, job, result) {
        await job.updateProgress(10);
        // Get top tracks from Spotify
        const topTracks = await circuit_breaker_1.circuitBreaker.execute(async () => this.spotifyClient.getArtistTopTracks(spotifyId, { market: 'US' }));
        if (!topTracks || topTracks.length === 0) {
            return;
        }
        await job.updateProgress(30);
        // Update popularity for existing songs
        for (const track of topTracks) {
            try {
                const existingSong = await database_1.db
                    .select({ id: database_1.songs.id })
                    .from(database_1.songs)
                    .where((0, database_1.eq)(database_1.songs.spotifyId, track.id))
                    .get();
                if (existingSong) {
                    // Update popularity
                    await database_1.db
                        .update(database_1.songs)
                        .set({
                        popularity: track.popularity || 0,
                        updatedAt: new Date(),
                    })
                        .where((0, database_1.eq)(database_1.songs.id, existingSong.id));
                    result.songsUpdated++;
                }
                else {
                    // Create new song if it doesn't exist
                    const [song] = await database_1.db
                        .insert(database_1.songs)
                        .values({
                        spotifyId: track.id,
                        name: track.name,
                        artist: artist.name,
                        albumName: track.album?.name,
                        albumId: track.album?.id,
                        trackNumber: track.track_number,
                        albumType: track.album?.album_type,
                        albumArtUrl: track.album?.images?.[0]?.url,
                        releaseDate: track.album?.release_date,
                        durationMs: track.duration_ms,
                        popularity: track.popularity || 0,
                        previewUrl: track.preview_url,
                        spotifyUri: track.uri,
                        externalUrls: JSON.stringify(track.external_urls),
                        isExplicit: track.explicit || false,
                        isPlayable: !track.restrictions,
                    })
                        .returning();
                    // Link to artist
                    await database_1.db
                        .insert(database_1.artistSongs)
                        .values({
                        artistId: artist.id,
                        songId: song.id,
                        isPrimaryArtist: true,
                    })
                        .onConflictDoNothing();
                    result.songsUpdated++;
                }
            }
            catch (error) {
                result.errors.push(`Failed to process top track ${track.name}: ${error.message}`);
            }
        }
        await job.updateProgress(100);
    }
    static async syncFullCatalog(artist, spotifyId, job, result, options) {
        // Full catalog sync combines profile + albums + top tracks
        await this.syncArtistProfile(artist, spotifyId, job, result);
        await job.updateProgress(25);
        await this.syncArtistTopTracks(artist, spotifyId, job, result);
        await job.updateProgress(50);
        await this.syncArtistAlbums(artist, spotifyId, job, result, options);
        await job.updateProgress(90);
        // Update final sync timestamp
        await database_1.db
            .update(database_1.artists)
            .set({
            songCatalogSyncedAt: new Date(),
            lastFullSyncAt: new Date(),
        })
            .where((0, database_1.eq)(database_1.artists.id, artist.id));
        await job.updateProgress(100);
    }
    static async updateArtistSongStats(artistId) {
        // Count total songs and albums for the artist
        const stats = await database_1.db
            .select({
            totalSongs: (0, database_1.sql) `COUNT(DISTINCT ${database_1.songs.id})`,
            totalAlbums: (0, database_1.sql) `COUNT(DISTINCT ${database_1.songs.albumId})`,
        })
            .from(database_1.songs)
            .innerJoin(database_1.artistSongs, (0, database_1.eq)(database_1.songs.id, database_1.artistSongs.songId))
            .where((0, database_1.eq)(database_1.artistSongs.artistId, artistId))
            .get();
        if (stats) {
            await database_1.db
                .update(database_1.artists)
                .set({
                totalSongs: stats.totalSongs,
                totalAlbums: stats.totalAlbums,
                updatedAt: new Date(),
            })
                .where((0, database_1.eq)(database_1.artists.id, artistId));
        }
    }
    static isLiveTrack(name) {
        const liveKeywords = [
            /\blive\b/i,
            /\bconcert\b/i,
            /\btour\b/i,
            /\bshow\b/i,
            /\bacoustic\b/i,
            /\bunplugged\b/i,
        ];
        return liveKeywords.some(pattern => pattern.test(name));
    }
    static isRemixTrack(name) {
        const remixKeywords = [
            /\bremix\b/i,
            /\bedit\b/i,
            /\brework\b/i,
            /\bremaster\b/i,
            /\bversion\b/i,
        ];
        return remixKeywords.some(pattern => pattern.test(name));
    }
    // Batch processing helper for large catalogs
    static async processInBatches(items, processor, batchSize = 5, delayMs = 100) {
        const results = [];
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.allSettled(batch.map(processor));
            batchResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
            });
            // Rate limiting delay
            if (i + batchSize < items.length && delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        return results;
    }
}
exports.SpotifySyncProcessor = SpotifySyncProcessor;
exports.default = SpotifySyncProcessor;
