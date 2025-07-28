import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { songs } from "./setlists";

export const artists = pgTable("artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  spotifyId: text("spotify_id").unique(),
  ticketmasterId: text("ticketmaster_id").unique(),
  mbid: text("mbid").unique(), // MusicBrainz ID for Setlist.fm
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  imageUrl: text("image_url"),
  smallImageUrl: text("small_image_url"),
  genres: text("genres"), // JSON array
  popularity: integer("popularity").default(0),
  followers: integer("followers").default(0), // Spotify followers
  followerCount: integer("follower_count").default(0), // App followers
  monthlyListeners: integer("monthly_listeners"),
  verified: boolean("verified").default(false),
  bio: text("bio"),
  externalUrls: text("external_urls"), // JSON object
  lastSyncedAt: timestamp("last_synced_at"),
  songCatalogSyncedAt: timestamp("song_catalog_synced_at"),
  totalAlbums: integer("total_albums").default(0),
  totalSongs: integer("total_songs").default(0),
  lastFullSyncAt: timestamp("last_full_sync_at"),

  // Historical tracking for real growth calculations
  previousFollowers: integer("previous_followers"),
  previousPopularity: integer("previous_popularity"),
  previousMonthlyListeners: integer("previous_monthly_listeners"),
  previousFollowerCount: integer("previous_follower_count"),
  lastGrowthCalculated: timestamp("last_growth_calculated"),

  trendingScore: doublePrecision("trending_score").default(0),
  totalShows: integer("total_shows").default(0),
  upcomingShows: integer("upcoming_shows").default(0),
  totalSetlists: integer("total_setlists").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const artistStats = pgTable("artist_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id")
    .references(() => artists.id, { onDelete: "cascade" })
    .notNull(),
  totalShows: integer("total_shows").default(0),
  upcomingShows: integer("upcoming_shows").default(0),
  totalSetlists: integer("total_setlists").default(0),
  avgSetlistLength: doublePrecision("avg_setlist_length"),
  mostPlayedSong: text("most_played_song"),
  lastShowDate: timestamp("last_show_date"),
  totalVotes: integer("total_votes").default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const artistSongs = pgTable("artist_songs", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id")
    .references(() => artists.id, { onDelete: "cascade" })
    .notNull(),
  songId: uuid("song_id")
    .references(() => songs.id, { onDelete: "cascade" })
    .notNull(),
  isPrimaryArtist: boolean("is_primary_artist").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
