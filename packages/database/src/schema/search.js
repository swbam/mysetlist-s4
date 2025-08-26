"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userBans = exports.artistFollowers = exports.popularSearches = exports.savedSearches = exports.searchAnalytics = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const artists_1 = require("./artists");
const users_1 = require("./users");
// Search analytics table
exports.searchAnalytics = (0, pg_core_1.pgTable)("search_analytics", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => users_1.users.id, { onDelete: "set null" }),
    sessionId: (0, pg_core_1.varchar)("session_id", { length: 255 }),
    query: (0, pg_core_1.text)("query").notNull(),
    searchType: (0, pg_core_1.varchar)("search_type", { length: 50 }).notNull(), // 'artist', 'venue', 'show', 'global'
    resultsCount: (0, pg_core_1.integer)("results_count").default(0),
    responseTimeMs: (0, pg_core_1.integer)("response_time_ms"),
    clickedResultId: (0, pg_core_1.uuid)("clicked_result_id"),
    clickedResultType: (0, pg_core_1.varchar)("clicked_result_type", { length: 50 }),
    clickedResultPosition: (0, pg_core_1.integer)("clicked_result_position"),
    searchTimestamp: (0, pg_core_1.timestamp)("search_timestamp").defaultNow().notNull(),
    userAgent: (0, pg_core_1.text)("user_agent"),
    ipAddress: (0, pg_core_1.inet)("ip_address"),
    metadata: (0, pg_core_1.jsonb)("metadata"),
});
// Saved searches table
exports.savedSearches = (0, pg_core_1.pgTable)("saved_searches", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => users_1.users.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    query: (0, pg_core_1.text)("query").notNull(),
    searchType: (0, pg_core_1.varchar)("search_type", { length: 50 }).notNull(),
    filters: (0, pg_core_1.jsonb)("filters"),
    notificationEnabled: (0, pg_core_1.boolean)("notification_enabled").default(false),
    lastChecked: (0, pg_core_1.timestamp)("last_checked").defaultNow(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    uniqueUserName: (0, pg_core_1.unique)().on(table.userId, table.name),
}));
// Popular searches table
exports.popularSearches = (0, pg_core_1.pgTable)("popular_searches", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    query: (0, pg_core_1.text)("query").notNull(),
    searchType: (0, pg_core_1.varchar)("search_type", { length: 50 }).notNull(),
    count: (0, pg_core_1.integer)("count").default(1),
    lastSearched: (0, pg_core_1.timestamp)("last_searched").defaultNow(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    uniqueQueryType: (0, pg_core_1.unique)().on(table.query, table.searchType),
}));
// Artist followers table
exports.artistFollowers = (0, pg_core_1.pgTable)("artist_followers", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    artistId: (0, pg_core_1.uuid)("artist_id")
        .notNull()
        .references(() => artists_1.artists.id, { onDelete: "cascade" }),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => users_1.users.id, { onDelete: "cascade" }),
    followedAt: (0, pg_core_1.timestamp)("followed_at").defaultNow().notNull(),
    notificationEnabled: (0, pg_core_1.boolean)("notification_enabled").default(true),
}, (table) => ({
    uniqueArtistUser: (0, pg_core_1.unique)().on(table.artistId, table.userId),
}));
// User bans table
exports.userBans = (0, pg_core_1.pgTable)("user_bans", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => users_1.users.id, { onDelete: "cascade" }),
    bannedBy: (0, pg_core_1.uuid)("banned_by")
        .notNull()
        .references(() => users_1.users.id),
    reason: (0, pg_core_1.text)("reason").notNull(),
    banType: (0, pg_core_1.varchar)("ban_type", { length: 50 }).default("temporary"), // 'temporary', 'permanent'
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    liftedAt: (0, pg_core_1.timestamp)("lifted_at"),
    liftedBy: (0, pg_core_1.uuid)("lifted_by").references(() => users_1.users.id),
    liftReason: (0, pg_core_1.text)("lift_reason"),
});
