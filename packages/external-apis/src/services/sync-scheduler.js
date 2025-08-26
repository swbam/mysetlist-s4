"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncScheduler = void 0;
// @ts-nocheck
const database_1 = require("@repo/database");
const spotify_1 = require("../clients/spotify");
// Use @repo/database exports for db and helpers
const artist_sync_1 = require("./artist-sync");
const setlist_sync_1 = require("./setlist-sync");
const show_sync_1 = require("./show-sync");
const venue_sync_1 = require("./venue-sync");
class SyncScheduler {
    artistSync;
    venueSync;
    showSync;
    setlistSync;
    jobs = new Map();
    lastSyncTime;
    currentErrors = [];
    constructor() {
        this.artistSync = new artist_sync_1.ArtistSyncService();
        this.venueSync = new venue_sync_1.VenueSyncService();
        this.showSync = new show_sync_1.ShowSyncService();
        this.setlistSync = new setlist_sync_1.SetlistSyncService();
    }
    async runInitialSync() {
        // await this.artistSync.syncPopularArtists();
        await this.venueSync.syncMajorVenues();
        const majorCities = [
            { city: "New York", stateCode: "NY" },
            { city: "Los Angeles", stateCode: "CA" },
            { city: "Chicago", stateCode: "IL" },
            { city: "San Francisco", stateCode: "CA" },
            { city: "Austin", stateCode: "TX" },
            { city: "Seattle", stateCode: "WA" },
            { city: "Denver", stateCode: "CO" },
            { city: "Nashville", stateCode: "TN" },
            { city: "Portland", stateCode: "OR" },
            { city: "Atlanta", stateCode: "GA" },
        ];
        for (const { city, stateCode } of majorCities) {
            await this.showSync.syncUpcomingShows({
                city,
                stateCode,
            });
            // Rate limit between cities
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    }
    async runDailySync() {
        // Sync upcoming shows for the next 30 days
        const startDateTime = new Date().toISOString();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        const endDateTime = endDate.toISOString();
        await this.showSync.syncUpcomingShows({
            startDateTime,
            endDateTime,
        });
    }
    async syncByLocation(city, stateCode) {
        // 1. Sync venues in the city
        await this.venueSync.syncVenuesByCity(city, stateCode);
        // 2. Sync upcoming shows in the city
        await this.showSync.syncUpcomingShows({
            city,
            ...(stateCode && { stateCode }),
        });
    }
    async syncArtistData(artistName) {
        // 1. Sync artist from Spotify
        const spotifyClient = new spotify_1.SpotifyClient({});
        await spotifyClient.authenticate();
        const searchResult = await spotifyClient.searchArtists(artistName, 1);
        if (searchResult.artists.items.length > 0) {
            const artist = searchResult.artists.items[0];
            if (artist) {
                await this.artistSync.syncArtist(artist.id);
                // 2. Sync historical setlists
                await this.showSync.syncHistoricalSetlists(artistName);
                // 3. Create default setlists for upcoming shows
                await this.setlistSync.createDefaultSetlists((await database_1.db
                    .select({ id: database_1.artists.id })
                    .from(database_1.artists)
                    .where((0, database_1.eq)(database_1.artists.spotifyId, artist.id))
                    .limit(1))[0]?.id || "");
            }
        }
        else {
        }
    }
    async syncCustom(options) {
        if (options.artists) {
            // await this.artistSync.syncPopularArtists();
        }
        if (options.venues && options.city) {
            await this.venueSync.syncVenuesByCity(options.city, options.stateCode);
        }
        else if (options.venues) {
            await this.venueSync.syncMajorVenues();
        }
        if (options.shows) {
            await this.showSync.syncUpcomingShows({
                ...(options.city && { city: options.city }),
                ...(options.stateCode && { stateCode: options.stateCode }),
                ...(options.startDate && { startDateTime: options.startDate }),
                ...(options.endDate && { endDateTime: options.endDate }),
            });
        }
        if (options.setlists && options.artistName) {
            // No-op: setlists for new shows are created via createDefaultSetlists
        }
    }
    // Utility method to sync data for a specific show
    async syncShowDetails(showId) {
        await this.setlistSync.syncSetlistByShowId(showId);
    }
    // Job management methods
    createJob(type) {
        const id = Date.now().toString();
        const job = {
            id,
            type,
            status: "pending",
            startTime: new Date(),
        };
        this.jobs.set(id, job);
        return job;
    }
    startJob(job) {
        job.status = "running";
        job.startTime = new Date();
    }
    completeJob(job, result) {
        job.status = "completed";
        job.endTime = new Date();
        job.result = result;
        this.lastSyncTime = new Date();
    }
    failJob(job, error) {
        job.status = "failed";
        job.endTime = new Date();
        job.error = error;
        if (!this.currentErrors.includes(error)) {
            this.currentErrors.push(error);
        }
    }
    getJob(jobId) {
        return this.jobs.get(jobId);
    }
    getAllJobs() {
        return Array.from(this.jobs.values());
    }
    getJobStats() {
        const jobs = Array.from(this.jobs.values());
        return {
            totalJobs: jobs.length,
            runningJobs: jobs.filter((j) => j.status === "running").length,
            completedJobs: jobs.filter((j) => j.status === "completed").length,
            failedJobs: jobs.filter((j) => j.status === "failed").length,
            pendingJobs: jobs.filter((j) => j.status === "pending").length,
        };
    }
    getHealthStatus() {
        const failedJobs = this.getAllJobs().filter((j) => j.status === "failed");
        const recentErrors = failedJobs
            .slice(-5)
            .map((j) => j.error)
            .filter(Boolean);
        return {
            isHealthy: failedJobs.length === 0 || failedJobs.length < 3,
            ...(this.lastSyncTime && { lastSyncTime: this.lastSyncTime }),
            errors: [...new Set([...this.currentErrors, ...recentErrors])].slice(-10),
        };
    }
    // Clear old jobs to prevent memory leaks
    clearOldJobs() {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        for (const [jobId, job] of this.jobs.entries()) {
            if (job.endTime && job.endTime < oneDayAgo) {
                this.jobs.delete(jobId);
            }
        }
    }
    // Scheduler control methods
    async startScheduler() {
        // Create a job for the initial sync
        const job = this.createJob("initial-sync");
        this.startJob(job);
        try {
            await this.runInitialSync();
            this.completeJob(job);
        }
        catch (error) {
            this.failJob(job, error instanceof Error ? error.message : "Unknown error");
            throw error;
        }
    }
    async stopScheduler() {
        // Mark all running jobs as stopped
        for (const job of this.jobs.values()) {
            if (job.status === "running") {
                job.status = "failed";
                job.error = "Scheduler stopped";
                job.endTime = new Date();
            }
        }
    }
    async runJobNow(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        if (job.status === "running") {
            throw new Error(`Job ${jobId} is already running`);
        }
        this.startJob(job);
        try {
            // Run the appropriate sync based on job type
            switch (job.type) {
                case "initial-sync":
                    await this.runInitialSync();
                    break;
                case "daily-sync":
                    await this.runDailySync();
                    break;
                default:
                    throw new Error(`Unknown job type: ${job.type}`);
            }
            this.completeJob(job);
        }
        catch (error) {
            this.failJob(job, error instanceof Error ? error.message : "Unknown error");
            throw error;
        }
    }
    enableJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            return false;
        }
        if (job.status === "failed") {
            job.status = "pending";
            delete job.error;
        }
        return true;
    }
    disableJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            return false;
        }
        if (job.status === "running") {
            job.status = "failed";
            job.error = "Job disabled";
            job.endTime = new Date();
        }
        else if (job.status === "pending") {
            job.status = "failed";
            job.error = "Job disabled";
        }
        return true;
    }
    deleteJob(jobId) {
        return this.jobs.delete(jobId);
    }
    async scheduleJob(type, _schedule) {
        const job = this.createJob(type);
        return job;
    }
    updateJobSchedule(jobId, _schedule) {
        const job = this.jobs.get(jobId);
        if (!job) {
            return false;
        }
        return true;
    }
}
exports.SyncScheduler = SyncScheduler;
