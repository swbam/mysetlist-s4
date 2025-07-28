import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { users } from "./users"

export const authProviderEnum = pgEnum("auth_provider", [
  "spotify",
  "google",
  "apple",
])

export const userAuthTokens = pgTable("user_auth_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  // Provider information
  provider: authProviderEnum("provider").notNull(),
  providerId: text("provider_id").notNull(), // User ID from the provider

  // Token data (encrypted in production)
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").default("Bearer"),
  scope: text("scope"), // JSON array of scopes

  // Token expiration
  expiresAt: timestamp("expires_at"),

  // Provider profile data (JSON)
  providerProfile: text("provider_profile"), // JSON string

  // Status
  isActive: boolean("is_active").default(true).notNull(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
})

// Table for storing user's followed artists
export const userFollowedArtists = pgTable("user_followed_artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  // Artist information
  artistId: text("artist_id").notNull(), // Spotify artist ID
  artistName: text("artist_name").notNull(),
  artistImage: text("artist_image"),

  // Follow preferences
  notifyNewShows: boolean("notify_new_shows").default(true).notNull(),
  notifySetlistUpdates: boolean("notify_setlist_updates")
    .default(true)
    .notNull(),

  // Metadata
  followedAt: timestamp("followed_at").defaultNow().notNull(),
  unfollowedAt: timestamp("unfollowed_at"),
  isActive: boolean("is_active").default(true).notNull(),
})

// Enhanced user preferences for music
export const userMusicPreferences = pgTable("user_music_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .unique()
    .notNull(),

  // Music preferences from Spotify
  favoriteGenres: text("favorite_genres"), // JSON array
  topArtists: text("top_artists"), // JSON array of Spotify artist data
  topTracks: text("top_tracks"), // JSON array of Spotify track data

  // Location preferences
  preferredVenues: text("preferred_venues"), // JSON array
  notificationRadius: integer("notification_radius").default(50), // km

  // Recommendation settings
  enablePersonalizedRecommendations: boolean(
    "enable_personalized_recommendations"
  ).default(true),
  includeSpotifyData: boolean("include_spotify_data").default(true),

  // Sync settings
  lastSpotifySync: timestamp("last_spotify_sync"),
  autoSyncSpotify: boolean("auto_sync_spotify").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
