"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.venues = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.venues = (0, pg_core_1.pgTable)("venues", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").notNull(),
    slug: (0, pg_core_1.text)("slug").unique().notNull(),
    tmVenueId: (0, pg_core_1.text)("tm_venue_id").unique(), // Ticketmaster Venue ID
    address: (0, pg_core_1.text)("address"),
    city: (0, pg_core_1.text)("city").notNull(),
    state: (0, pg_core_1.text)("state"),
    country: (0, pg_core_1.text)("country").notNull(),
    postalCode: (0, pg_core_1.text)("postal_code"),
    latitude: (0, pg_core_1.doublePrecision)("latitude"),
    longitude: (0, pg_core_1.doublePrecision)("longitude"),
    timezone: (0, pg_core_1.text)("timezone").notNull(),
    capacity: (0, pg_core_1.integer)("capacity"),
    venueType: (0, pg_core_1.text)("venue_type"), // arena, theater, club, etc.
    phoneNumber: (0, pg_core_1.text)("phone_number"),
    website: (0, pg_core_1.text)("website"),
    imageUrl: (0, pg_core_1.text)("image_url"),
    description: (0, pg_core_1.text)("description"),
    amenities: (0, pg_core_1.text)("amenities"), // JSON array
    // Analytics fields
    totalShows: (0, pg_core_1.integer)("total_shows").default(0),
    upcomingShows: (0, pg_core_1.integer)("upcoming_shows").default(0),
    totalAttendance: (0, pg_core_1.integer)("total_attendance").default(0),
    averageRating: (0, pg_core_1.doublePrecision)("average_rating"),
    // Historical tracking for real growth calculations
    previousTotalShows: (0, pg_core_1.integer)("previous_total_shows"),
    previousUpcomingShows: (0, pg_core_1.integer)("previous_upcoming_shows"),
    previousTotalAttendance: (0, pg_core_1.integer)("previous_total_attendance"),
    lastGrowthCalculated: (0, pg_core_1.timestamp)("last_growth_calculated"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    tmVenueIdIdx: (0, pg_core_1.index)("idx_venue_tm").on(table.tmVenueId),
}));
// Removed venueTips table and venueTipCategoryEnum - not part of core MVP requirements
