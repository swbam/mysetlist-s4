"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userFollowsArtists = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const artists_1 = require("./artists");
const users_1 = require("./users");
// Temporary table definition to fix the relations error
// This table is scheduled for removal but needed for backwards compatibility
exports.userFollowsArtists = (0, pg_core_1.pgTable)("user_follows_artists", {
    userId: (0, pg_core_1.uuid)("user_id")
        .references(() => users_1.users.id, { onDelete: "cascade" })
        .notNull(),
    artistId: (0, pg_core_1.uuid)("artist_id")
        .references(() => artists_1.artists.id, { onDelete: "cascade" })
        .notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => ({
    pk: (0, pg_core_1.primaryKey)({ columns: [table.userId, table.artistId] }),
}));
