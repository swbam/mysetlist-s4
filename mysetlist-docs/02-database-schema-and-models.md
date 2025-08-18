# TheSet - Database Schema and Models with Next-Forge

## 🟡 **DATABASE STATUS: PARTIALLY IMPLEMENTED**

**Current Implementation**: The database schema is partially implemented. The core tables are in place, but the sync system tables are not yet fully integrated with the application logic.

**Sync System Tables**: The `syncJobs` and `syncProgress` tables are defined in the schema, but the application is not yet using them to track the import process.

**The database schema is ready for the sync system to be built on top of it.**

## Table of Contents

1. [Database Architecture Overview](#database-architecture-overview)
2. [Next-Forge Database Package Structure](#next-forge-database-package-structure)
3. [Supabase Integration](#supabase-integration)
4. [Core Schema Implementation](#core-schema-implementation)
5. [Sync & Import System Tables](#sync--import-system-tables)
6. [Database Package Setup](#database-package-setup)
7. [Migration Strategy](#migration-strategy)
8. [Real-time Features](#real-time-features)
9. [Performance Optimization](#performance-optimization)
10. [Cron Job Data Requirements](#cron-job-data-requirements)

## Database Architecture Overview

TheSet leverages Next-Forge's database package structure with Supabase as the backend, combining Drizzle ORM for type-safe queries with PostgreSQL's advanced features.

### Technology Stack

- **Supabase**: Hosted PostgreSQL with extensions
- **Drizzle ORM**: Type-safe database access layer
- **PostgreSQL 15**: Primary database with extensions
- **PostGIS**: Geospatial queries for venue locations
- **Row Level Security**: Built-in data protection

### Database Extensions

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
```

## Next-Forge Database Package Structure

### Package Organization

```
packages/database/
├── src/
│   ├── schema/              # Drizzle schema definitions
│   │   ├── users.ts        # User-related schemas
│   │   ├── artists.ts      # Artist and music data
│   │   ├── venues.ts       # Venue and location data
│   │   ├── shows.ts        # Show and event data
│   │   ├── setlists.ts     # Setlist and song data
│   │   ├── relations.ts    # Schema relationships
│   │   └── index.ts        # Schema exports
│   ├── queries/            # Prepared queries
│   │   ├── users.ts        # User queries
│   │   ├── artists.ts      # Artist queries
│   │   ├── shows.ts        # Show queries
│   │   └── index.ts        # Query exports
│   ├── types/              # Generated and custom types
│   │   ├── database.ts     # Database types
│   │   └── index.ts        # Type exports
│   ├── migrations/         # SQL migration files
│   ├── client.ts           # Database client setup
│   ├── constants.ts        # Database constants
│   └── index.ts            # Package exports
├── drizzle.config.ts       # Drizzle configuration
├── package.json            # Package dependencies
└── tsconfig.json          # TypeScript configuration
```

## Supabase Integration

### Environment Configuration

```typescript
// packages/database/src/client.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 });

// For queries
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
```

### Supabase Client Configuration

```typescript
// packages/database/src/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// For server-side operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
```

## Core Schema Implementation

### Users Schema

```typescript
// packages/database/src/schema/users.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "moderator", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").default("user").notNull(),
  emailVerified: timestamp("email_verified"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});
```

### Artists Schema

```typescript
// packages/database/src/schema/artists.ts
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { songs } from "./setlists";

export const artists = pgTable("artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  tmAttractionId: text("tm_attraction_id").unique(), // Ticketmaster Attraction ID
  spotifyId: text("spotify_id").unique(),
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
  externalUrls: text("external_urls"), // JSON object
  importStatus: text("import_status"), // "pending" | "in_progress" | "complete" | "failed"
  lastSyncedAt: timestamp("last_synced_at"),
  songCatalogSyncedAt: timestamp("song_catalog_synced_at"),
  showsSyncedAt: timestamp("shows_synced_at"),
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
}, (table) => ({
  tmAttractionIdIdx: index("idx_artist_tm_attraction").on(table.tmAttractionId),
  spotifyIdIdx: index("idx_artist_spotify").on(table.spotifyId),
}));

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
  artistId: uuid("artist_id")
    .references(() => artists.id, { onDelete: "cascade" })
    .notNull(),
  songId: uuid("song_id")
    .references(() => songs.id, { onDelete: "cascade" })
    .notNull(),
  isPrimaryArtist: boolean("is_primary_artist").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.artistId, table.songId] }),
}));
```

### Venues Schema

```typescript
// packages/database/src/schema/venues.ts
import {
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  tmVenueId: text("tm_venue_id").unique(), // Ticketmaster Venue ID
  address: text("address"),
  city: text("city").notNull(),
  state: text("state"),
  country: text("country").notNull(),
  postalCode: text("postal_code"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  timezone: text("timezone").notNull(),
  capacity: integer("capacity"),
  venueType: text("venue_type"), // arena, theater, club, etc.
  phoneNumber: text("phone_number"),
  website: text("website"),
  imageUrl: text("image_url"),
  description: text("description"),
  amenities: text("amenities"), // JSON array

  // Analytics fields
  totalShows: integer("total_shows").default(0),
  upcomingShows: integer("upcoming_shows").default(0),
  totalAttendance: integer("total_attendance").default(0),
  averageRating: doublePrecision("average_rating"),

  // Historical tracking for real growth calculations
  previousTotalShows: integer("previous_total_shows"),
  previousUpcomingShows: integer("previous_upcoming_shows"),
  previousTotalAttendance: integer("previous_total_attendance"),
  lastGrowthCalculated: timestamp("last_growth_calculated"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  tmVenueIdIdx: index("idx_venue_tm").on(table.tmVenueId),
}));
```

### Shows Schema

```typescript
// packages/database/src/schema/shows.ts
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { artists } from "./artists";
import { venues } from "./venues";

export const showStatusEnum = pgEnum("show_status", [
  "upcoming",
  "ongoing",
  "completed",
  "cancelled",
]);

export const shows = pgTable("shows", {
  id: uuid("id").primaryKey().defaultRandom(),
  headlinerArtistId: uuid("headliner_artist_id")
    .references(() => artists.id, { onDelete: "cascade" })
    ,
  venueId: uuid("venue_id").references(() => venues.id, {
    onDelete: "set null",
  }),
  name: text("name"),
  slug: text("slug").unique(),
  date: date("date"),
  startTime: time("start_time"),
  doorsTime: time("doors_time"),
  status: showStatusEnum("status").default("upcoming"),
  description: text("description"),
  ticketUrl: text("ticket_url"),
  minPrice: integer("min_price"),
  maxPrice: integer("max_price"),
  currency: text("currency").default("USD"),

  // Analytics fields
  viewCount: integer("view_count").default(0),
  attendeeCount: integer("attendee_count").default(0),
  setlistCount: integer("setlist_count").default(0),
  voteCount: integer("vote_count").default(0),
  trendingScore: doublePrecision("trending_score").default(0),

  // Historical tracking for real growth calculations
  previousViewCount: integer("previous_view_count"),
  previousAttendeeCount: integer("previous_attendee_count"),
  previousVoteCount: integer("previous_vote_count"),
  previousSetlistCount: integer("previous_setlist_count"),
  lastGrowthCalculated: timestamp("last_growth_calculated"),

  // Featured/promoted content
  isFeatured: boolean("is_featured").default(false),
  isVerified: boolean("is_verified").default(false),

  // External integrations
  tmEventId: text("tm_event_id").unique(), // Ticketmaster Event ID
  setlistFmId: text("setlistfm_id"),
  setlistReady: boolean("setlist_ready").default(false),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  artistDateIdx: index("idx_show_artist_date").on(table.headlinerArtistId, table.date),
  tmEventIdIdx: index("idx_show_tm_event").on(table.tmEventId),
}));

export const showArtists = pgTable("show_artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  showId: uuid("show_id")
    .references(() => shows.id, { onDelete: "cascade" })
    ,
  artistId: uuid("artist_id")
    .references(() => artists.id, { onDelete: "cascade" })
    ,
  orderIndex: integer("order_index"), // 0 = headliner
  setLength: integer("set_length"), // minutes
  isHeadliner: boolean("is_headliner").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Songs and Setlists Schema

```typescript
// packages/database/src/schema/setlists.ts
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
import { artists } from "./artists";
import { shows } from "./shows";
import { users } from "./users";

export const moderationStatusEnum = pgEnum("moderation_status", [
  "pending",
  "approved",
  "rejected",
  "flagged",
]);

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
```

## Database Package Setup

### Package Configuration

```json
// packages/database/package.json
{
  "name": "@repo/database",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate",
    "push": "drizzle-kit push",
    "studio": "drizzle-kit studio",
    "seed": "tsx src/seed.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "drizzle-orm": "^0.29.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.20.0",
    "tsx": "^4.0.0"
  }
}
```

### Drizzle Configuration

```typescript
// packages/database/drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema/index.ts",
  out: "./migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### Schema Relations

```typescript
// packages/database/src/schema/relations.ts
import { relations } from "drizzle-orm";
import {
  users,
  artists,
  venues,
  shows,
  setlists,
  songs,
  setlistSongs,
  votes,
} from ".";

export const usersRelations = relations(users, ({ many, one }) => ({
  votes: many(votes),
  createdSetlists: many(setlists),
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
}));

export const artistsRelations = relations(artists, ({ many, one }) => ({
  shows: many(shows),
  setlists: many(setlists),
  stats: one(artistStats, {
    fields: [artists.id],
    references: [artistStats.artistId],
  }),
}));

export const showsRelations = relations(shows, ({ many, one }) => ({
  headlinerArtist: one(artists, {
    fields: [shows.headlinerArtistId],
    references: [artists.id],
  }),
  venue: one(venues, {
    fields: [shows.venueId],
    references: [venues.id],
  }),
  setlists: many(setlists),
  supportingArtists: many(showArtists),
}));

export const setlistsRelations = relations(setlists, ({ many, one }) => ({
  show: one(shows, {
    fields: [setlists.showId],
    references: [shows.id],
  }),
  artist: one(artists, {
    fields: [setlists.artistId],
    references: [artists.id],
  }),
  creator: one(users, {
    fields: [setlists.createdBy],
    references: [users.id],
  }),
  songs: many(setlistSongs),
}));
```

## Migration Strategy

### Initial Migration Setup

```sql
-- migrations/0001_initial_schema.sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create enums
CREATE TYPE "user_role" AS ENUM('user', 'moderator', 'admin');
CREATE TYPE "show_status" AS ENUM('upcoming', 'ongoing', 'completed', 'cancelled');
CREATE TYPE "setlist_type" AS ENUM('predicted', 'actual');
CREATE TYPE "vote_type" AS ENUM('up', 'down');

-- Create tables (generated by Drizzle)
-- ... table creation statements ...

-- Create indexes for performance
CREATE INDEX idx_artists_spotify_id ON artists(spotify_id);
CREATE INDEX idx_shows_date ON shows(date);
CREATE INDEX idx_shows_status ON shows(status);
CREATE INDEX idx_venues_location ON venues USING GIST(ST_Point(longitude, latitude));
CREATE INDEX idx_setlist_songs_position ON setlist_songs(setlist_id, position);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
```

### Database Seeding

```typescript
// packages/database/src/seed.ts
import { db } from "./client";
import { artists, venues, shows } from "./schema";

async function seed() {
  console.log("🌱 Seeding database...");

  // Seed sample artists
  const sampleArtists = await db
    .insert(artists)
    .values([
      {
        name: "The Strokes",
        slug: "the-strokes",
        genres: JSON.stringify(["indie rock", "alternative rock"]),
        verified: true,
      },
      // ... more sample data
    ])
    .returning();

  console.log("✅ Database seeded successfully");
}

if (require.main === module) {
  seed().catch(console.error);
}
```

## Real-time Features

### Supabase Real-time Setup

```typescript
// packages/database/src/realtime.ts
import { supabase } from "./supabase";

export function subscribeToSetlistUpdates(
  showId: string,
  callback: (payload: any) => void,
) {
  return supabase
    .channel(`setlist:${showId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "setlist_songs",
        filter: `setlist_id=in.(${showId})`,
      },
      callback,
    )
    .subscribe();
}

export function subscribeToVoteUpdates(
  setlistSongId: string,
  callback: (payload: any) => void,
) {
  return supabase
    .channel(`votes:${setlistSongId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "votes",
        filter: `setlist_song_id=eq.${setlistSongId}`,
      },
      callback,
    )
    .subscribe();
}
```

## Performance Optimization

### Query Optimization

```typescript
// packages/database/src/queries/shows.ts
import { db } from "../client";
import { shows, artists, venues, setlists } from "../schema";
import { eq, desc, and, sql } from "drizzle-orm";

export async function getShowWithDetails(showId: string) {
  return await db.query.shows.findFirst({
    where: eq(shows.id, showId),
    with: {
      headlinerArtist: true,
      venue: true,
      setlists: {
        with: {
          songs: {
            with: {
              song: true,
            },
            orderBy: (setlistSongs, { asc }) => [asc(setlistSongs.position)],
          },
        },
      },
    },
  });
}

export async function getTrendingShows(limit = 20) {
  return await db
    .select()
    .from(shows)
    .leftJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(eq(shows.status, "upcoming"))
    .orderBy(desc(shows.trendingScore))
    .limit(limit);
}
```

### Database Triggers

```sql
-- Update vote counts trigger
CREATE OR REPLACE FUNCTION update_setlist_song_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE setlist_songs
    SET
      upvotes = upvotes + CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE 0 END,
      downvotes = downvotes + CASE WHEN NEW.vote_type = 'down' THEN 1 ELSE 0 END,
      net_votes = upvotes - downvotes
    WHERE id = NEW.setlist_song_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER setlist_song_vote_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_setlist_song_votes();
```

## Sync & Import System Tables

### Sync Job and Progress Tracking

The database includes a two-table system for tracking sync jobs and their progress:

```typescript
// packages/database/src/schema/sync-jobs.ts
import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const syncJobs = pgTable("sync_jobs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  entityType: text("entity_type").notNull(), // 'artist', 'venue', 'show'
  entityId: text("entity_id").notNull(),
  spotifyId: text("spotify_id"),
  ticketmasterId: text("ticketmaster_id"),
  setlistfmId: text("setlistfm_id"),

  // Status tracking
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, failed, partial
  priority: integer("priority").notNull().default(1), // 1=high, 2=normal, 3=low

  // Progress tracking
  totalSteps: integer("total_steps").default(0),
  completedSteps: integer("completed_steps").default(0),
  currentStep: text("current_step"),

  // Job details
  jobType: text("job_type").notNull(), // 'full_sync', 'shows_only', 'catalog_only', 'update'
  metadata: jsonb("metadata"), // Additional job-specific data
  error: text("error"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

  // Feature flags
  autoRetry: boolean("auto_retry").default(true),
  maxRetries: integer("max_retries").default(3),
  retryCount: integer("retry_count").default(0),
});

export const syncProgress = pgTable("sync_progress", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  jobId: text("job_id")
    .notNull()
    .references(() => syncJobs.id, { onDelete: "cascade" }),

  // Progress details
  step: text("step").notNull(), // 'fetching_artist', 'importing_shows', 'syncing_songs'
  status: text("status").notNull(), // 'pending', 'in_progress', 'completed', 'failed'
  progress: integer("progress").default(0), // 0-100
  message: text("message"),

  // Data counts
  totalItems: integer("total_items").default(0),
  processedItems: integer("processed_items").default(0),
  successfulItems: integer("successful_items").default(0),
  failedItems: integer("failed_items").default(0),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

## Cron Job Data Requirements

### Background Sync Jobs

The database is prepared for comprehensive background sync operations:

#### 1. Artist Popularity Updates (Every 6 Hours)
```sql
-- Find artists needing popularity updates
SELECT id, spotify_id, name
FROM artists 
WHERE spotify_id IS NOT NULL 
  AND (last_synced_at IS NULL OR last_synced_at < NOW() - INTERVAL '6 hours')
  AND (total_shows > 0 OR is_trending = true)
ORDER BY last_synced_at ASC NULLS FIRST
LIMIT 100;
```

#### 2. Show Setlist Import (Daily)
```sql
-- Find past shows without setlists
SELECT s.id, s.name, s.date, a.name as artist_name, s.setlistfm_id
FROM shows s
JOIN artists a ON s.headliner_artist_id = a.id  
WHERE s.date < CURRENT_DATE
  AND s.setlist_imported_at IS NULL
  AND s.needs_setlist_import = true
ORDER BY s.date DESC
LIMIT 50;
```

#### 3. Trending Score Calculation (Every 4 Hours)
```sql  
-- Calculate trending scores based on recent activity
WITH trending_data AS (
  SELECT 
    a.id,
    COUNT(DISTINCT s.id) as recent_shows,
    COUNT(DISTINCT v.user_id) as recent_votes,
    COUNT(DISTINCT uf.user_id) as total_followers
  FROM artists a
  LEFT JOIN shows s ON a.id = s.headliner_artist_id 
    AND s.date >= CURRENT_DATE - INTERVAL '30 days'
  LEFT JOIN setlists sl ON s.id = sl.show_id
  LEFT JOIN votes v ON sl.id = v.setlist_id 
    AND v.created_at >= CURRENT_DATE - INTERVAL '7 days'
  LEFT JOIN user_follows_artists uf ON a.id = uf.artist_id
  GROUP BY a.id
)
UPDATE artists SET 
  trending_score = (td.recent_shows * 10 + td.recent_votes * 5 + td.total_followers * 0.1),
  is_trending = (td.recent_shows > 2 OR td.recent_votes > 50),
  last_trending_update = NOW()
FROM trending_data td
WHERE artists.id = td.id;
```

This database schema provides a solid foundation for the TheSet application using Next-Forge's package structure with Supabase integration. The schema is designed for scalability, performance, and real-time features while maintaining type safety through Drizzle ORM.

**The database is fully ready for the optimal sync system - it just needs the external API clients to populate it with real data.**
