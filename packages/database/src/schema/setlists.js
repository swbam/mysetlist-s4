"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.votes = exports.setlistSongs = exports.setlists = exports.setlistTypeEnum = exports.songs = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const admin_1 = require("./admin");
const artists_1 = require("./artists");
const shows_1 = require("./shows");
const users_1 = require("./users");
exports.songs = (0, pg_core_1.pgTable)("songs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    spotifyId: (0, pg_core_1.text)("spotify_id").unique(),
    isrc: (0, pg_core_1.text)("isrc"), // International Standard Recording Code
    name: (0, pg_core_1.text)("name").notNull(), // Renamed from title
    albumName: (0, pg_core_1.text)("album_name"), // Renamed from album
    artist: (0, pg_core_1.text)("artist").notNull(), // Primary artist name
    albumId: (0, pg_core_1.text)("album_id"),
    trackNumber: (0, pg_core_1.integer)("track_number"),
    discNumber: (0, pg_core_1.integer)("disc_number").default(1),
    albumType: (0, pg_core_1.text)("album_type"), // 'album', 'single', 'compilation'
    albumArtUrl: (0, pg_core_1.text)("album_art_url"),
    releaseDate: (0, pg_core_1.date)("release_date"),
    durationMs: (0, pg_core_1.integer)("duration_ms"),
    popularity: (0, pg_core_1.integer)("popularity").default(0),
    previewUrl: (0, pg_core_1.text)("preview_url"),
    spotifyUri: (0, pg_core_1.text)("spotify_uri"),
    externalUrls: (0, pg_core_1.text)("external_urls"), // JSON object
    isExplicit: (0, pg_core_1.boolean)("is_explicit").default(false),
    isPlayable: (0, pg_core_1.boolean)("is_playable").default(true),
    isLive: (0, pg_core_1.boolean)("is_live").default(false), // Track is live performance
    isRemix: (0, pg_core_1.boolean)("is_remix").default(false), // Track is a remix
    acousticness: (0, pg_core_1.text)("acousticness"), // Spotify audio features
    danceability: (0, pg_core_1.text)("danceability"),
    energy: (0, pg_core_1.text)("energy"),
    valence: (0, pg_core_1.text)("valence"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    isrcIdx: (0, pg_core_1.index)("idx_song_isrc").on(table.isrc),
    popularityIdx: (0, pg_core_1.index)("idx_song_popularity").on(table.popularity),
    spotifyIdIdx: (0, pg_core_1.index)("idx_song_spotify").on(table.spotifyId),
}));
exports.setlistTypeEnum = (0, pg_core_1.pgEnum)("setlist_type", ["predicted", "actual"]);
exports.setlists = (0, pg_core_1.pgTable)("setlists", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    showId: (0, pg_core_1.uuid)("show_id")
        .references(() => shows_1.shows.id)
        .notNull(),
    artistId: (0, pg_core_1.uuid)("artist_id")
        .references(() => artists_1.artists.id)
        .notNull(),
    type: (0, exports.setlistTypeEnum)("type").notNull(),
    name: (0, pg_core_1.text)("name").default("Main Set"),
    orderIndex: (0, pg_core_1.integer)("order_index").default(0),
    isLocked: (0, pg_core_1.boolean)("is_locked").default(false),
    totalVotes: (0, pg_core_1.integer)("total_votes").default(0),
    accuracyScore: (0, pg_core_1.integer)("accuracy_score").default(0), // 0-100
    // Moderation status
    moderationStatus: (0, admin_1.moderationStatusEnum)("moderation_status").default("approved"),
    // Import tracking
    importedFrom: (0, pg_core_1.text)("imported_from"), // 'setlist.fm', 'manual', 'api'
    externalId: (0, pg_core_1.text)("external_id"),
    importedAt: (0, pg_core_1.timestamp)("imported_at"),
    createdBy: (0, pg_core_1.uuid)("created_by").references(() => users_1.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.setlistSongs = (0, pg_core_1.pgTable)("setlist_songs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    setlistId: (0, pg_core_1.uuid)("setlist_id")
        .references(() => exports.setlists.id)
        .notNull(),
    songId: (0, pg_core_1.uuid)("song_id")
        .references(() => exports.songs.id)
        .notNull(),
    position: (0, pg_core_1.integer)("position").notNull(),
    notes: (0, pg_core_1.text)("notes"), // "acoustic", "cover", "new song", etc.
    isPlayed: (0, pg_core_1.boolean)("is_played"), // For actual setlists
    playTime: (0, pg_core_1.timestamp)("play_time"), // When song was played
    // Vote aggregations (denormalized for performance) - upvotes only, no downvotes
    upvotes: (0, pg_core_1.integer)("upvotes").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    uniqueSetlistPosition: (0, pg_core_1.unique)().on(table.setlistId, table.position),
}));
// Simplified voting system - upvotes only, no downvotes for positive user experience
exports.votes = (0, pg_core_1.pgTable)("votes", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id")
        .references(() => users_1.users.id)
        .notNull(),
    setlistSongId: (0, pg_core_1.uuid)("setlist_song_id")
        .references(() => exports.setlistSongs.id)
        .notNull(),
    // No voteType field needed - presence of record = upvote, absence = no vote
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    uniqueUserVote: (0, pg_core_1.unique)().on(table.userId, table.setlistSongId),
}));
