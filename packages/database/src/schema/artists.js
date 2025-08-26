"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.artistSongs = exports.artistStats = exports.artists = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const setlists_1 = require("./setlists");
exports.artists = (0, pg_core_1.pgTable)("artists", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    tmAttractionId: (0, pg_core_1.text)("tm_attraction_id").unique(), // Ticketmaster Attraction ID
    spotifyId: (0, pg_core_1.text)("spotify_id").unique(),
    mbid: (0, pg_core_1.text)("mbid").unique(), // MusicBrainz ID for Setlist.fm
    name: (0, pg_core_1.text)("name").notNull(),
    slug: (0, pg_core_1.text)("slug").unique().notNull(),
    imageUrl: (0, pg_core_1.text)("image_url"),
    smallImageUrl: (0, pg_core_1.text)("small_image_url"),
    genres: (0, pg_core_1.text)("genres"), // JSON array
    popularity: (0, pg_core_1.integer)("popularity").default(0),
    followers: (0, pg_core_1.integer)("followers").default(0), // Spotify followers
    followerCount: (0, pg_core_1.integer)("follower_count").default(0), // App followers
    monthlyListeners: (0, pg_core_1.integer)("monthly_listeners"),
    verified: (0, pg_core_1.boolean)("verified").default(false),
    externalUrls: (0, pg_core_1.text)("external_urls"), // JSON object
    importStatus: (0, pg_core_1.text)("import_status"), // "pending" | "in_progress" | "complete" | "failed"
    lastSyncedAt: (0, pg_core_1.timestamp)("last_synced_at"),
    songCatalogSyncedAt: (0, pg_core_1.timestamp)("song_catalog_synced_at"),
    showsSyncedAt: (0, pg_core_1.timestamp)("shows_synced_at"),
    totalAlbums: (0, pg_core_1.integer)("total_albums").default(0),
    totalSongs: (0, pg_core_1.integer)("total_songs").default(0),
    lastFullSyncAt: (0, pg_core_1.timestamp)("last_full_sync_at"),
    // Historical tracking for real growth calculations
    previousFollowers: (0, pg_core_1.integer)("previous_followers"),
    previousPopularity: (0, pg_core_1.integer)("previous_popularity"),
    previousMonthlyListeners: (0, pg_core_1.integer)("previous_monthly_listeners"),
    previousFollowerCount: (0, pg_core_1.integer)("previous_follower_count"),
    lastGrowthCalculated: (0, pg_core_1.timestamp)("last_growth_calculated"),
    trendingScore: (0, pg_core_1.doublePrecision)("trending_score").default(0),
    totalShows: (0, pg_core_1.integer)("total_shows").default(0),
    upcomingShows: (0, pg_core_1.integer)("upcoming_shows").default(0),
    totalSetlists: (0, pg_core_1.integer)("total_setlists").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    tmAttractionIdIdx: (0, pg_core_1.index)("idx_artist_tm_attraction").on(table.tmAttractionId),
    spotifyIdIdx: (0, pg_core_1.index)("idx_artist_spotify").on(table.spotifyId),
}));
exports.artistStats = (0, pg_core_1.pgTable)("artist_stats", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    artistId: (0, pg_core_1.uuid)("artist_id")
        .references(() => exports.artists.id, { onDelete: "cascade" })
        .notNull(),
    totalShows: (0, pg_core_1.integer)("total_shows").default(0),
    upcomingShows: (0, pg_core_1.integer)("upcoming_shows").default(0),
    totalSetlists: (0, pg_core_1.integer)("total_setlists").default(0),
    avgSetlistLength: (0, pg_core_1.doublePrecision)("avg_setlist_length"),
    mostPlayedSong: (0, pg_core_1.text)("most_played_song"),
    lastShowDate: (0, pg_core_1.timestamp)("last_show_date"),
    totalVotes: (0, pg_core_1.integer)("total_votes").default(0),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.artistSongs = (0, pg_core_1.pgTable)("artist_songs", {
    artistId: (0, pg_core_1.uuid)("artist_id")
        .references(() => exports.artists.id, { onDelete: "cascade" })
        .notNull(),
    songId: (0, pg_core_1.uuid)("song_id")
        .references(() => setlists_1.songs.id, { onDelete: "cascade" })
        .notNull(),
    isPrimaryArtist: (0, pg_core_1.boolean)("is_primary_artist").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    pk: (0, pg_core_1.primaryKey)({ columns: [table.artistId, table.songId] }),
}));
