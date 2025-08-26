"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showArtists = exports.shows = exports.showStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const artists_1 = require("./artists");
const venues_1 = require("./venues");
exports.showStatusEnum = (0, pg_core_1.pgEnum)("show_status", [
    "upcoming",
    "ongoing",
    "completed",
    "cancelled",
]);
exports.shows = (0, pg_core_1.pgTable)("shows", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    headlinerArtistId: (0, pg_core_1.uuid)("headliner_artist_id")
        .references(() => artists_1.artists.id, { onDelete: "cascade" }),
    venueId: (0, pg_core_1.uuid)("venue_id").references(() => venues_1.venues.id, {
        onDelete: "set null",
    }),
    name: (0, pg_core_1.text)("name"),
    slug: (0, pg_core_1.text)("slug").unique(),
    date: (0, pg_core_1.date)("date"),
    startTime: (0, pg_core_1.time)("start_time"),
    doorsTime: (0, pg_core_1.time)("doors_time"),
    status: (0, exports.showStatusEnum)("status").default("upcoming"),
    description: (0, pg_core_1.text)("description"),
    ticketUrl: (0, pg_core_1.text)("ticket_url"),
    minPrice: (0, pg_core_1.integer)("min_price"),
    maxPrice: (0, pg_core_1.integer)("max_price"),
    currency: (0, pg_core_1.text)("currency").default("USD"),
    // Analytics fields
    viewCount: (0, pg_core_1.integer)("view_count").default(0),
    attendeeCount: (0, pg_core_1.integer)("attendee_count").default(0),
    setlistCount: (0, pg_core_1.integer)("setlist_count").default(0),
    voteCount: (0, pg_core_1.integer)("vote_count").default(0),
    trendingScore: (0, pg_core_1.doublePrecision)("trending_score").default(0),
    // Historical tracking for real growth calculations
    previousViewCount: (0, pg_core_1.integer)("previous_view_count"),
    previousAttendeeCount: (0, pg_core_1.integer)("previous_attendee_count"),
    previousVoteCount: (0, pg_core_1.integer)("previous_vote_count"),
    previousSetlistCount: (0, pg_core_1.integer)("previous_setlist_count"),
    lastGrowthCalculated: (0, pg_core_1.timestamp)("last_growth_calculated"),
    // Featured/promoted content
    isFeatured: (0, pg_core_1.boolean)("is_featured").default(false),
    isVerified: (0, pg_core_1.boolean)("is_verified").default(false),
    // External integrations
    tmEventId: (0, pg_core_1.text)("tm_event_id").unique(), // Ticketmaster Event ID
    setlistFmId: (0, pg_core_1.text)("setlistfm_id"),
    setlistReady: (0, pg_core_1.boolean)("setlist_ready").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    artistDateIdx: (0, pg_core_1.index)("idx_show_artist_date").on(table.headlinerArtistId, table.date),
    tmEventIdIdx: (0, pg_core_1.index)("idx_show_tm_event").on(table.tmEventId),
}));
exports.showArtists = (0, pg_core_1.pgTable)("show_artists", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    showId: (0, pg_core_1.uuid)("show_id")
        .references(() => exports.shows.id, { onDelete: "cascade" }),
    artistId: (0, pg_core_1.uuid)("artist_id")
        .references(() => artists_1.artists.id, { onDelete: "cascade" }),
    orderIndex: (0, pg_core_1.integer)("order_index"), // 0 = headliner
    setLength: (0, pg_core_1.integer)("set_length"), // minutes
    isHeadliner: (0, pg_core_1.boolean)("is_headliner").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Removed showComments table - not part of core MVP requirements
