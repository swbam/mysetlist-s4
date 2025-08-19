import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { moderationStatusEnum } from "./admin";
import { artists } from "./artists";
import { shows } from "./shows";
import { users } from "./users";

export const songs = pgTable("songs", {
  id: uuid("id").primaryKey().defaultRandom(),
  spotifyId: text("spotify_id").unique(),
  isrc: text("isrc"), // International Standard Recording Code
  name: text("name").notNull(), // Renamed from title
  albumName: text("album_name"), // Renamed from album
  artist: text("artist").notNull(), // Primary artist name
  albumId: text("album_id"),
  trackNumber: integer("track_number"),
  discNumber: integer("disc_number").default(1),
  albumType: text("album_type"), // 'album', 'single', 'compilation'
  albumArtUrl: text("album_art_url"),
  releaseDate: date("release_date"),
  durationMs: integer("duration_ms"),
  popularity: integer("popularity").default(0),
  previewUrl: text("preview_url"),
  spotifyUri: text("spotify_uri"),
  externalUrls: text("external_urls"), // JSON object
  isExplicit: boolean("is_explicit").default(false),
  isPlayable: boolean("is_playable").default(true),
  isLive: boolean("is_live").default(false), // Track is live performance
  isRemix: boolean("is_remix").default(false), // Track is a remix
  acousticness: text("acousticness"), // Spotify audio features
  danceability: text("danceability"),
  energy: text("energy"),
  valence: text("valence"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  isrcIdx: index("idx_song_isrc").on(table.isrc),
  popularityIdx: index("idx_song_popularity").on(table.popularity),
  spotifyIdIdx: index("idx_song_spotify").on(table.spotifyId),
}));

export const setlistTypeEnum = pgEnum("setlist_type", ["predicted", "actual"]);

export const setlists = pgTable("setlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  showId: uuid("show_id")
    .references(() => shows.id)
    .notNull(),
  artistId: uuid("artist_id")
    .references(() => artists.id)
    .notNull(),
  type: setlistTypeEnum("type").notNull(),
  name: text("name").default("Main Set"),
  orderIndex: integer("order_index").default(0),
  isLocked: boolean("is_locked").default(false),
  totalVotes: integer("total_votes").default(0),
  accuracyScore: integer("accuracy_score").default(0), // 0-100
  
  // Moderation status
  moderationStatus: moderationStatusEnum("moderation_status").default("approved"),

  // Import tracking
  importedFrom: text("imported_from"), // 'setlist.fm', 'manual', 'api'
  externalId: text("external_id"),
  importedAt: timestamp("imported_at"),

  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const setlistSongs = pgTable(
  "setlist_songs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    setlistId: uuid("setlist_id")
      .references(() => setlists.id)
      .notNull(),
    songId: uuid("song_id")
      .references(() => songs.id)
      .notNull(),
    position: integer("position").notNull(),
    notes: text("notes"), // "acoustic", "cover", "new song", etc.
    isPlayed: boolean("is_played"), // For actual setlists
    playTime: timestamp("play_time"), // When song was played

    // Vote aggregations (denormalized for performance) - upvotes only, no downvotes
    upvotes: integer("upvotes").default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueSetlistPosition: unique().on(table.setlistId, table.position),
  }),
);

// Simplified voting system - upvotes only, no downvotes for positive user experience
export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    setlistSongId: uuid("setlist_song_id")
      .references(() => setlistSongs.id)
      .notNull(),
    // No voteType field needed - presence of record = upvote, absence = no vote
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserVote: unique().on(table.userId, table.setlistSongId),
  }),
);
