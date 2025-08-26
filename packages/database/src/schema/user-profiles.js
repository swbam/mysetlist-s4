"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userProfiles = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
exports.userProfiles = (0, pg_core_1.pgTable)("user_profiles", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id")
        .references(() => users_1.users.id, { onDelete: "cascade" })
        .unique()
        .notNull(),
    // Profile information
    bio: (0, pg_core_1.text)("bio"),
    location: (0, pg_core_1.text)("location"),
    favoriteGenres: (0, pg_core_1.text)("favorite_genres"), // JSON array
    // Social links
    instagramUrl: (0, pg_core_1.text)("instagram_url"),
    twitterUrl: (0, pg_core_1.text)("twitter_url"),
    spotifyUrl: (0, pg_core_1.text)("spotify_url"),
    // Profile settings
    isPublic: (0, pg_core_1.boolean)("is_public").default(true).notNull(),
    showAttendedShows: (0, pg_core_1.boolean)("show_attended_shows").default(true).notNull(),
    showVotedSongs: (0, pg_core_1.boolean)("show_voted_songs").default(true).notNull(),
    // Statistics
    showsAttended: (0, pg_core_1.integer)("shows_attended").default(0).notNull(),
    songsVoted: (0, pg_core_1.integer)("songs_voted").default(0).notNull(),
    artistsFollowed: (0, pg_core_1.integer)("artists_followed").default(0).notNull(),
    // Avatar
    avatarUrl: (0, pg_core_1.text)("avatar_url"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
