"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestShowsAndVenues = ingestShowsAndVenues;
const database_1 = require("@repo/database");
const drizzle_orm_1 = require("drizzle-orm");
// Async generator function as specified in GROK.md
async function* iterateEventsByAttraction(attractionId, apiKey) {
    let page = 0;
    let totalPages = 1;
    while (page < totalPages) {
        const url = `https://app.ticketmaster.com/discovery/v2/events.json?attractionId=${encodeURIComponent(attractionId)}&size=200&page=${page}&apikey=${apiKey}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`Ticketmaster API error: ${response.status} ${response.statusText}`);
                break;
            }
            const data = await response.json();
            totalPages = data?.page?.totalPages ?? 0;
            const events = data?._embedded?.events ?? [];
            if (events.length > 0) {
                yield events;
            }
            page++;
            // Add small delay to respect rate limits
            if (page < totalPages) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        catch (error) {
            console.error(`Error fetching events page ${page}:`, error);
            break;
        }
    }
}
async function ingestShowsAndVenues(artistId, tmAttractionId) {
    const apiKey = process.env['TICKETMASTER_API_KEY'];
    if (!apiKey) {
        throw new Error('TICKETMASTER_API_KEY not configured');
    }
    console.log(`Starting Ticketmaster ingest for artist ${artistId}, attraction ${tmAttractionId}`);
    try {
        for await (const events of iterateEventsByAttraction(tmAttractionId, apiKey)) {
            console.log(`Processing ${events.length} events from Ticketmaster`);
            // Extract unique venues from events
            const venuesMap = new Map();
            for (const event of events) {
                const venue = event._embedded?.venues?.[0];
                if (venue?.id) {
                    venuesMap.set(venue.id, venue);
                }
            }
            // Process venues and shows for this batch
            await processEventBatch(events, venuesMap, artistId);
        }
        console.log(`Completed Ticketmaster ingest for artist ${artistId}`);
    }
    catch (error) {
        console.error(`Ticketmaster ingest failed for artist ${artistId}:`, error);
        throw error;
    }
}
async function processEventBatch(events, venuesMap, artistId) {
    // Use Drizzle transaction for atomic operations
    await database_1.db.transaction(async (tx) => {
        // Process venues first
        if (venuesMap.size > 0) {
            const venueTmids = Array.from(venuesMap.keys());
            const existingVenues = await tx.select().from(database_1.venues)
                .where((0, drizzle_orm_1.inArray)(database_1.venues.tmVenueId, venueTmids));
            const existingVenueIds = new Set(existingVenues.map((v) => v.tmVenueId));
            const newVenues = venueTmids
                .filter((id) => !existingVenueIds.has(id))
                .map((id) => venuesMap.get(id))
                .map((venue) => ({
                tmVenueId: venue.id,
                name: venue.name,
                slug: generateSlug(venue.name),
                address: venue.address?.line1,
                city: venue.city?.name ?? "Unknown",
                state: venue.state?.stateCode,
                country: venue.country?.countryCode ?? "Unknown",
                postalCode: venue.postalCode,
                latitude: venue.location ? parseFloat(venue.location.latitude) : undefined,
                longitude: venue.location ? parseFloat(venue.location.longitude) : undefined,
                timezone: venue.timezone ?? "UTC",
            }));
            if (newVenues.length > 0) {
                await tx.insert(database_1.venues).values(newVenues);
                console.log(`Inserted ${newVenues.length} new venues`);
            }
        }
        // Get venue ID mapping for shows (within transaction)
        const dbVenues = await tx.select().from(database_1.venues)
            .where((0, drizzle_orm_1.inArray)(database_1.venues.tmVenueId, Array.from(venuesMap.keys())));
        const venueIdMap = new Map(dbVenues.map((v) => [v.tmVenueId, v.id]));
        // Process shows (within transaction)
        const showTmIds = events.map((e) => e.id);
        const existingShows = await tx.select().from(database_1.shows)
            .where((0, drizzle_orm_1.inArray)(database_1.shows.tmEventId, showTmIds));
        const existingShowIds = new Set(existingShows.map((s) => s.tmEventId));
        const newShows = events
            .filter((event) => !existingShowIds.has(event.id))
            .map((event) => {
            const venueId = event._embedded?.venues?.[0]?.id ? venueIdMap.get(event._embedded.venues[0].id) : undefined;
            if (!venueId)
                return null;
            const eventDate = event.dates?.start?.dateTime || event.dates?.start?.localDate;
            if (!eventDate)
                return null;
            return {
                tmEventId: event.id,
                headlinerArtistId: artistId,
                venueId: venueId,
                name: event.name,
                slug: generateSlug(event.name + '-' + eventDate),
                date: new Date(eventDate).toISOString().split('T')[0],
                startTime: event.dates?.start?.localTime,
                status: mapEventStatus(event.dates?.status?.code || 'onsale'),
                ticketUrl: event.url,
            };
        })
            .filter(Boolean);
        if (newShows.length > 0) {
            await tx.insert(database_1.shows).values(newShows);
            console.log(`Inserted ${newShows.length} new shows`);
        }
    }); // Close transaction
}
function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}
function mapEventStatus(statusCode) {
    switch (statusCode) {
        case "onsale":
        case "offsale":
            return "upcoming";
        case "cancelled":
            return "cancelled";
        default:
            return "upcoming";
    }
}
