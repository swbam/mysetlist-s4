"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtistImportOrchestrator = void 0;
const database_1 = require("@repo/database");
const spotify_1 = require("../clients/spotify");
const ticketmaster_1 = require("../clients/ticketmaster");
const error_handler_1 = require("../utils/error-handler");
const queues_1 = require("@repo/queues");
class ArtistImportOrchestrator {
    spotifyClient;
    ticketmasterClient;
    errorHandler;
    progressCallback;
    constructor(progressCallback) {
        this.spotifyClient = new spotify_1.SpotifyClient({});
        this.ticketmasterClient = new ticketmaster_1.TicketmasterClient({
            apiKey: process.env['TICKETMASTER_API_KEY'] || "",
        });
        this.progressCallback = progressCallback ?? undefined;
        this.errorHandler = new error_handler_1.SyncErrorHandler({
            maxRetries: 3,
            retryDelay: 2000,
            onError: (error) => {
                console.error("[ArtistImportOrchestrator] Error:", error);
            },
        });
    }
    /**
     * Comprehensive artist import following the optimal timing strategy
     */
    async importArtist(tmAttractionId) {
        const startTime = Date.now();
        const stages = [];
        let artistId = "";
        let slug = "";
        try {
            // Phase 1: Instant Artist Page Load (< 3 seconds)
            await this.updateProgress({
                stage: "initializing",
                progress: 5,
                message: "Getting artist details from Ticketmaster...",
            });
            // Get artist from Ticketmaster
            const tmArtist = await this.errorHandler.withRetry(() => this.ticketmasterClient.getAttraction(tmAttractionId), {
                service: "ArtistImportOrchestrator",
                operation: "getAttraction",
                context: { tmAttractionId },
            });
            if (!tmArtist || !tmArtist.name) {
                throw new error_handler_1.SyncServiceError(`Artist not found on Ticketmaster: ${tmAttractionId}`, "ArtistImportOrchestrator", "getEvent");
            }
            await this.updateProgress({
                stage: "syncing-identifiers",
                progress: 15,
                message: `Found ${tmArtist.name}. Looking up on Spotify...`,
            });
            // Quick Spotify lookup for basic data
            await this.spotifyClient.authenticate();
            const spotifySearch = await this.errorHandler.withRetry(() => this.spotifyClient.searchArtists(tmArtist.name, 5), {
                service: "ArtistImportOrchestrator",
                operation: "searchArtists",
                context: { artistName: tmArtist.name },
            });
            // Find best Spotify match
            let spotifyArtist = null;
            if (spotifySearch?.artists?.items &&
                spotifySearch.artists.items.length > 0) {
                spotifyArtist =
                    spotifySearch.artists.items.find((artist) => this.isArtistNameMatch(tmArtist.name, artist.name)) || spotifySearch.artists.items[0];
            }
            if (!spotifyArtist) {
                console.warn(`No Spotify match found for ${tmArtist.name}, continuing without Spotify data`);
                await this.updateProgress({
                    stage: "syncing-identifiers",
                    progress: 25,
                    message: `${tmArtist.name} - No Spotify match found, using Ticketmaster data only`,
                });
            }
            // Create minimal artist record for instant page load
            slug = this.generateSlug(spotifyArtist?.name || tmArtist.name);
            const [newArtist] = await database_1.db
                .insert(database_1.artists)
                .values({
                spotifyId: spotifyArtist?.id || null,
                tmAttractionId: tmAttractionId,
                name: spotifyArtist?.name || tmArtist.name,
                slug,
                imageUrl: spotifyArtist?.images?.[0]?.url || tmArtist.images?.[0]?.url || null,
                smallImageUrl: spotifyArtist?.images?.[2]?.url || null,
                genres: JSON.stringify(spotifyArtist?.genres || []),
                popularity: spotifyArtist?.popularity || 0,
                followers: spotifyArtist?.followers?.total || 0,
                externalUrls: JSON.stringify(spotifyArtist?.external_urls || {}),
                verified: false,
                lastSyncedAt: new Date(),
            })
                .onConflictDoUpdate({
                target: database_1.artists.tmAttractionId,
                set: {
                    tmAttractionId: tmAttractionId,
                    name: spotifyArtist?.name || tmArtist.name,
                    imageUrl: spotifyArtist?.images?.[0]?.url || tmArtist.images?.[0]?.url || null,
                    smallImageUrl: spotifyArtist?.images?.[2]?.url || null,
                    popularity: spotifyArtist?.popularity || 0,
                    followers: spotifyArtist?.followers?.total || 0,
                    lastSyncedAt: new Date(),
                },
            })
                .returning({ id: database_1.artists.id, slug: database_1.artists.slug });
            if (!newArtist) {
                throw new error_handler_1.SyncServiceError("Failed to create artist record", "ArtistImportOrchestrator", "insertArtist");
            }
            artistId = newArtist.id;
            slug = newArtist.slug;
            await this.updateProgress({
                stage: "syncing-identifiers",
                progress: 25,
                message: "Artist created! Starting comprehensive import...",
                artistId,
            });
            // Delegate the rest of the import process to the BullMQ queue
            await queues_1.queueManager.addJob(queues_1.QueueName.ARTIST_IMPORT, "import-artist", {
                artistId,
                tmAttractionId,
                spotifyArtistId: spotifyArtist.id,
                artistName: spotifyArtist.name,
            }, {
                priority: queues_1.Priority.CRITICAL,
                jobId: `import-${artistId}`,
            });
            const importDuration = Date.now() - startTime;
            return {
                success: true,
                artistId,
                slug,
                totalSongs: 0,
                totalShows: 0,
                totalVenues: 0,
                importDuration,
                stages,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            await this.updateProgress({
                stage: "failed",
                progress: 0,
                message: "Import failed",
                error: errorMessage,
                artistId,
                completedAt: new Date().toISOString(),
            });
            throw error;
        }
    }
    /**
     * Update import progress
     */
    async updateProgress(progress) {
        const fullProgress = {
            stage: "initializing",
            progress: 0,
            message: "",
            ...progress,
        };
        if (this.progressCallback) {
            await this.progressCallback(fullProgress);
        }
    }
    /**
     * Helper methods
     */
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    }
    isArtistNameMatch(name1, name2) {
        const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normalized1 = normalize(name1);
        const normalized2 = normalize(name2);
        return (normalized1 === normalized2 ||
            normalized1.includes(normalized2) ||
            normalized2.includes(normalized1));
    }
}
exports.ArtistImportOrchestrator = ArtistImportOrchestrator;
