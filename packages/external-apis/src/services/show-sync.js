"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShowSyncService = void 0;
// @ts-nocheck
const database_1 = require("@repo/database");
const setlistfm_1 = require("../clients/setlistfm");
const spotify_1 = require("../clients/spotify");
const ticketmaster_1 = require("../clients/ticketmaster");
const database_2 = require("@repo/database");
const error_handler_1 = require("../utils/error-handler");
const venue_sync_1 = require("./venue-sync");
const setlist_sync_1 = require("./setlist-sync");
class ShowSyncService {
    ticketmasterClient;
    setlistFmClient;
    spotifyClient;
    venueSyncService;
    setlistSyncService;
    errorHandler;
    constructor() {
        this.ticketmasterClient = new ticketmaster_1.TicketmasterClient({
            apiKey: process.env["TICKETMASTER_API_KEY"] || "",
        });
        this.setlistFmClient = new setlistfm_1.SetlistFmClient({
            apiKey: process.env["SETLISTFM_API_KEY"] || "",
        });
        this.spotifyClient = new spotify_1.SpotifyClient({}); // SpotifyClient reads credentials from env in authenticate()
        this.venueSyncService = new venue_sync_1.VenueSyncService();
        this.setlistSyncService = new setlist_sync_1.SetlistSyncService();
        this.errorHandler = new error_handler_1.SyncErrorHandler({
            maxRetries: 3,
            retryDelay: 1000,
            onError: (error) => {
                console.error("[ShowSyncService] Error:", error);
            },
        });
    }
    async syncShowFromTicketmaster(event) {
        // Find or create venue using VenueSyncService
        let venueId = null;
        if (event._embedded?.venues?.[0]) {
            const ticketmasterVenue = event._embedded.venues[0];
            // First check if venue already exists
            const venueSlug = this.generateSlug(ticketmasterVenue.name);
            const existingVenueResults = await database_2.db
                .select()
                .from(database_1.venues)
                .where((0, database_2.eq)(database_1.venues.slug, venueSlug))
                .limit(1);
            if (existingVenueResults.length > 0 && existingVenueResults[0]) {
                venueId = existingVenueResults[0].id;
            }
            else {
                // Create venue using VenueSyncService
                try {
                    await this.venueSyncService.syncVenueFromTicketmaster(ticketmasterVenue);
                    // Get the newly created venue
                    const newVenueResults = await database_2.db
                        .select()
                        .from(database_1.venues)
                        .where((0, database_2.eq)(database_1.venues.slug, venueSlug))
                        .limit(1);
                    if (newVenueResults.length > 0 && newVenueResults[0]) {
                        venueId = newVenueResults[0].id;
                    }
                }
                catch (error) {
                    console.error(`Failed to create venue ${ticketmasterVenue.name}:`, error);
                    // Continue without venue
                }
            }
        }
        // Find or create artist
        let artistId = null;
        if (event._embedded?.attractions?.[0]) {
            const attraction = event._embedded.attractions[0];
            try {
                await this.spotifyClient.authenticate();
            }
            catch (error) {
                console.error("Failed to authenticate with Spotify:", error);
                // Continue without artist data - still create the show
            }
            try {
                // Search for artist on Spotify with retry
                const searchResult = await this.errorHandler.withRetry(() => this.spotifyClient.searchArtists(attraction.name, 1), {
                    service: "ShowSyncService",
                    operation: "searchArtists",
                    context: { attractionName: attraction.name },
                });
                if (!searchResult) {
                    console.warn(`No Spotify search result for attraction: ${attraction.name}`);
                    // Continue without artist data - still create the show
                }
                else if (searchResult.artists.items.length > 0) {
                    const spotifyArtist = searchResult.artists.items[0];
                    if (spotifyArtist) {
                        // Create or update artist
                        const [artist] = await database_2.db
                            .insert(database_1.artists)
                            .values({
                            spotifyId: spotifyArtist.id,
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
                                name: spotifyArtist.name,
                                imageUrl: spotifyArtist.images[0]?.url || null,
                                smallImageUrl: spotifyArtist.images[2]?.url || null,
                                popularity: spotifyArtist.popularity,
                                followers: spotifyArtist.followers.total,
                                lastSyncedAt: new Date(),
                            },
                        })
                            .returning({ id: database_1.artists.id });
                        if (artist) {
                            artistId = artist.id;
                        }
                    }
                }
            }
            catch (error) {
                console.error(`Failed to sync artist ${attraction.name}:`, error);
                // Continue without artist data
            }
        }
        // If we still don't have an artist, create a placeholder one based on the Ticketmaster data
        if (!artistId && event._embedded?.attractions?.[0]) {
            const attraction = event._embedded.attractions[0];
            try {
                console.log(`Creating placeholder artist for: ${attraction.name}`);
                const [placeholderArtist] = await database_2.db
                    .insert(database_1.artists)
                    .values({
                    name: attraction.name,
                    slug: this.generateSlug(attraction.name),
                    tmAttractionId: attraction.id,
                    lastSyncedAt: new Date(),
                })
                    .onConflictDoUpdate({
                    target: database_1.artists.tmAttractionId,
                    set: {
                        name: attraction.name,
                        lastSyncedAt: new Date(),
                    },
                })
                    .returning({ id: database_1.artists.id });
                if (placeholderArtist) {
                    artistId = placeholderArtist.id;
                    console.log(`Created placeholder artist with ID: ${artistId}`);
                }
            }
            catch (error) {
                console.error(`Failed to create placeholder artist for ${attraction.name}:`, error);
            }
        }
        // If we STILL don't have an artist, skip this show
        if (!artistId) {
            console.warn(`Skipping show "${event.name}" - no artist found or created`);
            return { isNew: false, isUpdated: false };
        }
        // Check if show already exists before creating/updating
        const existingShowCheck = await database_2.db
            .select({ id: database_1.shows.id })
            .from(database_1.shows)
            .where((0, database_2.eq)(database_1.shows.tmEventId, event.id))
            .limit(1);
        const showExisted = existingShowCheck.length > 0;
        // Create or update show
        const showDate = new Date(event.dates.start.localDate);
        const [show] = await database_2.db
            .insert(database_1.shows)
            .values({
            headlinerArtistId: artistId,
            venueId,
            name: event.name,
            slug: this.generateShowSlug(event.name, showDate),
            date: event.dates.start.localDate,
            ...(event.dates.start.localTime && {
                startTime: event.dates.start.localTime,
            }),
            status: this.mapTicketmasterStatus(event.dates.status.code),
            ticketUrl: event.url,
            ...(event.priceRanges?.[0]?.min && {
                minPrice: event.priceRanges[0].min,
            }),
            ...(event.priceRanges?.[0]?.max && {
                maxPrice: event.priceRanges[0].max,
            }),
            currency: event.priceRanges?.[0]?.currency || "USD",
            tmEventId: event.id,
        })
            .onConflictDoUpdate({
            target: database_1.shows.tmEventId,
            set: {
                status: this.mapTicketmasterStatus(event.dates.status.code),
                ...(event.priceRanges?.[0]?.min && {
                    minPrice: event.priceRanges[0].min,
                }),
                ...(event.priceRanges?.[0]?.max && {
                    maxPrice: event.priceRanges[0].max,
                }),
                updatedAt: new Date(),
            },
        })
            .returning({ id: database_1.shows.id });
        if (!show) {
            return { isNew: false, isUpdated: false };
        }
        // Determine if this was a new show or an update based on prior existence
        const isNew = !showExisted;
        const isUpdated = showExisted;
        // Add supporting acts if available
        if (event._embedded?.attractions &&
            event._embedded.attractions.length > 1) {
            for (let i = 1; i < event._embedded.attractions.length; i++) {
                const attraction = event._embedded.attractions[i];
                if (!attraction)
                    continue;
                try {
                    const searchResult = await this.spotifyClient.searchArtists(attraction.name, 1);
                    if (searchResult.artists.items.length > 0) {
                        const spotifyArtist = searchResult.artists.items[0];
                        if (spotifyArtist) {
                            const [supportingArtist] = await database_2.db
                                .insert(database_1.artists)
                                .values({
                                spotifyId: spotifyArtist.id,
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
                                    lastSyncedAt: new Date(),
                                },
                            })
                                .returning({ id: database_1.artists.id });
                            if (supportingArtist) {
                                await database_2.db
                                    .insert(database_1.showArtists)
                                    .values({
                                    showId: show.id,
                                    artistId: supportingArtist.id,
                                    orderIndex: i,
                                    isHeadliner: false,
                                })
                                    .onConflictDoNothing();
                            }
                        }
                    }
                }
                catch (_error) { }
            }
        }
        // Create initial setlist for new shows (only for upcoming shows)
        if (isNew && show.id) {
            try {
                const showDate = new Date(event.dates.start.localDate);
                const isUpcoming = showDate > new Date();
                if (isUpcoming) {
                    console.log(`Creating initial setlist for new show: ${event.name}`);
                    const setlistResult = await this.setlistSyncService.ensureInitialSetlists(show.id, {
                        songCount: 5,
                        weightByPopularity: true,
                        excludeLive: true,
                    });
                    if (setlistResult.created) {
                        console.log(`Created initial setlist with ${setlistResult.songCount} songs (skipped ${setlistResult.skippedLive} live tracks)`);
                    }
                    else {
                        console.log("Initial setlist already exists for this show");
                    }
                }
            }
            catch (error) {
                console.error(`Failed to create initial setlist for show ${show.id}:`, error);
                // Don't fail the entire show sync if setlist creation fails
            }
        }
        return { isNew, isUpdated };
    }
    async syncShowFromSetlistFm(setlist) {
        // Find artist
        const artistResults = await database_2.db
            .select()
            .from(database_1.artists)
            .where((0, database_2.eq)(database_1.artists.name, setlist.artist.name))
            .limit(1);
        const artist = artistResults[0];
        if (!artist) {
            return;
        }
        // Find venue
        const venueResults = await database_2.db
            .select()
            .from(database_1.venues)
            .where((0, database_2.and)((0, database_2.eq)(database_1.venues.name, setlist.venue.name), (0, database_2.eq)(database_1.venues.city, setlist.venue.city.name)))
            .limit(1);
        const venue = venueResults[0];
        // Create or update show
        const showDate = new Date(setlist.eventDate);
        await database_2.db
            .insert(database_1.shows)
            .values({
            headlinerArtistId: artist.id,
            ...(venue?.id && { venueId: venue.id }),
            name: `${setlist.artist.name} at ${setlist.venue.name}`,
            slug: this.generateShowSlug(setlist.artist.name, showDate),
            date: setlist.eventDate,
            status: "completed",
            setlistFmId: setlist.id,
            isVerified: true,
        })
            .onConflictDoUpdate({
            target: database_1.shows.setlistFmId,
            set: {
                isVerified: true,
                updatedAt: new Date(),
            },
        });
    }
    async syncUpcomingShows(options) {
        const eventsResult = await this.errorHandler.withRetry(() => this.ticketmasterClient.searchEvents({
            ...options,
            size: 200,
        }), {
            service: "ShowSyncService",
            operation: "searchEvents",
            context: options,
        });
        if (!eventsResult) {
            throw new error_handler_1.SyncServiceError("Failed to fetch events from Ticketmaster", "ShowSyncService", "syncUpcomingShows");
        }
        const events = eventsResult;
        let newShows = 0;
        let updatedShows = 0;
        if (events._embedded?.events) {
            for (const event of events._embedded.events) {
                try {
                    const result = await this.syncShowFromTicketmaster(event);
                    if (result.isNew) {
                        newShows++;
                    }
                    else if (result.isUpdated) {
                        updatedShows++;
                    }
                }
                catch (error) {
                    console.error(`Failed to sync show from event ${event.id}:`, error);
                    // Continue with next event
                }
                // Rate limit
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
        return { newShows, updatedShows };
    }
    async syncArtistShows(artistDbId) {
        // Get artist info from database
        const [artist] = await database_2.db
            .select()
            .from(database_1.artists)
            .where((0, database_2.eq)(database_1.artists.id, artistDbId))
            .limit(1);
        if (!artist) {
            throw new error_handler_1.SyncServiceError(`Artist not found with ID: ${artistDbId}`, "ShowSyncService", "syncArtistShows");
        }
        let created = 0;
        let updated = 0;
        let upcomingShows = 0;
        let newShows = 0;
        let updatedShows = 0;
        const eventsToProcess = new Set(); // Avoid duplicates
        // Strategy 1: Search by Ticketmaster artist ID if available
        if (artist.tmAttractionId) {
            console.log(`Searching Ticketmaster events by artist ID: ${artist.tmAttractionId}`);
            try {
                const artistEventsResult = await this.errorHandler.withRetry(() => this.ticketmasterClient.searchEvents({
                    keyword: artist.tmAttractionId,
                    size: 200,
                }), {
                    service: "ShowSyncService",
                    operation: "searchEventsByAttractionId",
                    context: { attractionId: artist.tmAttractionId },
                });
                if (artistEventsResult?._embedded?.events) {
                    for (const event of artistEventsResult._embedded.events) {
                        eventsToProcess.add(event.id);
                    }
                }
            }
            catch (error) {
                console.warn(`Failed to search by attraction ID ${artist.tmAttractionId}:`, error);
            }
        }
        // Strategy 2: Search by artist name (as fallback or additional)
        try {
            const eventsResult = await this.errorHandler.withRetry(() => this.ticketmasterClient.searchEvents({
                keyword: artist.name,
                size: 200,
            }), {
                service: "ShowSyncService",
                operation: "searchEvents",
                context: { artistName: artist.name },
            });
            if (eventsResult?._embedded?.events) {
                for (const event of eventsResult._embedded.events) {
                    // Check if this event is actually for our artist
                    const attractionName = event._embedded?.attractions?.[0]?.name;
                    if (!attractionName ||
                        !this.isArtistMatch(artist.name, attractionName)) {
                        continue;
                    }
                    eventsToProcess.add(event.id);
                }
            }
        }
        catch (error) {
            console.warn(`Failed to search by artist name ${artist.name}:`, error);
        }
        console.log(`Found ${eventsToProcess.size} unique events for artist ${artist.name}`);
        // Process all unique events found
        for (const eventId of eventsToProcess) {
            try {
                // Get event details
                const eventDetails = await this.errorHandler.withRetry(() => this.ticketmasterClient.getEvent(eventId), {
                    service: "ShowSyncService",
                    operation: "getEvent",
                    context: { eventId },
                });
                if (!eventDetails)
                    continue;
                upcomingShows++;
                // Check if show already exists
                const existingShow = await database_2.db
                    .select()
                    .from(database_1.shows)
                    .where((0, database_2.eq)(database_1.shows.tmEventId, eventId))
                    .limit(1);
                if (existingShow.length > 0) {
                    // Update existing show
                    await database_2.db
                        .update(database_1.shows)
                        .set({
                        status: this.mapTicketmasterStatus(eventDetails.dates.status.code),
                        name: eventDetails.name,
                        ticketUrl: eventDetails.url,
                        ...(eventDetails.priceRanges?.[0]?.min && {
                            minPrice: eventDetails.priceRanges[0].min,
                        }),
                        ...(eventDetails.priceRanges?.[0]?.max && {
                            maxPrice: eventDetails.priceRanges[0].max,
                        }),
                        currency: eventDetails.priceRanges?.[0]?.currency || "USD",
                        updatedAt: new Date(),
                    })
                        .where((0, database_2.eq)(database_1.shows.tmEventId, eventId));
                    updated++;
                    updatedShows++;
                }
                else {
                    // Create new show
                    const result = await this.syncShowFromTicketmaster(eventDetails);
                    if (result.isNew) {
                        created++;
                        newShows++;
                    }
                }
                // Rate limit to avoid overwhelming APIs
                await new Promise((resolve) => setTimeout(resolve, 150));
            }
            catch (error) {
                console.error(`Failed to process event ${eventId}:`, error);
                // Continue with next event
            }
        }
        // Update artist stats
        await database_2.db
            .update(database_1.artists)
            .set({
            upcomingShows,
            totalShows: (artist.totalShows || 0) + created,
            updatedAt: new Date(),
        })
            .where((0, database_2.eq)(database_1.artists.id, artistDbId));
        return { upcomingShows, pastShows: 0, newShows, updatedShows };
    }
    async syncHistoricalSetlists(artistName) {
        const searchResult = await this.setlistFmClient.searchSetlists({
            artistName,
        });
        if (searchResult.setlist.length === 0) {
            return;
        }
        const artist = searchResult.setlist[0].artist;
        if (!artist) {
            return;
        }
        const artistMbid = artist.mbid;
        let page = 1;
        let hasMore = true;
        while (hasMore && page <= 10) {
            // Limit to 10 pages
            const setlists = await this.setlistFmClient.getArtistSetlists(artistMbid, page);
            if (setlists.setlist.length === 0) {
                hasMore = false;
                break;
            }
            for (const setlist of setlists.setlist) {
                await this.syncShowFromSetlistFm(setlist);
            }
            page++;
            // Rate limit
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    generateSlug(name, id) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    }
    generateShowSlug(name, id, date) {
        const dateStr = date.toISOString().split("T")[0];
        return `${this.generateSlug(name)}-${dateStr}`;
    }
    isArtistMatch(dbArtistName, ticketmasterArtistName) {
        const normalize = (name, id) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normalizedDb = normalize(dbArtistName);
        const normalizedTm = normalize(ticketmasterArtistName);
        // Exact match
        if (normalizedDb === normalizedTm) {
            return true;
        }
        // Check if one contains the other (for cases like "Artist" vs "Artist Band")
        if (normalizedDb.includes(normalizedTm) ||
            normalizedTm.includes(normalizedDb)) {
            return true;
        }
        return false;
    }
    mapTicketmasterStatus(code) {
        switch (code.toLowerCase()) {
            case "onsale":
                return "upcoming";
            case "offsale":
            case "rescheduled":
                return "upcoming";
            case "cancelled":
            case "canceled":
                return "cancelled";
            case "postponed":
                return "upcoming";
            default:
                return "upcoming";
        }
    }
}
exports.ShowSyncService = ShowSyncService;
