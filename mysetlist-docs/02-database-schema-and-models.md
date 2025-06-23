# TheSet - Database Schema and Models with Next-Forge

## Table of Contents
1. [Database Architecture Overview](#database-architecture-overview)
2. [Next-Forge Database Package Structure](#next-forge-database-package-structure)
3. [Supabase Integration](#supabase-integration)
4. [Core Schema Implementation](#core-schema-implementation)
5. [Database Package Setup](#database-package-setup)
6. [Migration Strategy](#migration-strategy)
7. [Real-time Features](#real-time-features)
8. [Performance Optimization](#performance-optimization)

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
│   │   ├── analytics.ts    # Analytics and metrics
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
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

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
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// For server-side operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  pgEnum 
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'user', 
  'moderator', 
  'admin'
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  spotifyId: text('spotify_id').unique(),
  spotifyRefreshToken: text('spotify_refresh_token'),
  role: userRoleEnum('role').default('user').notNull(),
  emailVerified: timestamp('email_verified'),
  lastLoginAt: timestamp('last_login_at'),
  preferences: text('preferences'), // JSON string for user preferences
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  bio: text('bio'),
  location: text('location'),
  website: text('website'),
  favoriteGenres: text('favorite_genres'), // JSON array
  concertCount: integer('concert_count').default(0),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Artists Schema
```typescript
// packages/database/src/schema/artists.ts
import { 
  pgTable, 
  uuid, 
  text, 
  integer, 
  boolean, 
  timestamp, 
  doublePrecision 
} from 'drizzle-orm/pg-core';

export const artists = pgTable('artists', {
  id: uuid('id').primaryKey().defaultRandom(),
  spotifyId: text('spotify_id').unique(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  imageUrl: text('image_url'),
  smallImageUrl: text('small_image_url'),
  genres: text('genres'), // JSON array
  popularity: integer('popularity').default(0),
  followers: integer('followers').default(0),
  monthlyListeners: integer('monthly_listeners'),
  verified: boolean('verified').default(false),
  bio: text('bio'),
  externalUrls: text('external_urls'), // JSON object
  lastSyncedAt: timestamp('last_synced_at'),
  trendingScore: doublePrecision('trending_score').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const artistStats = pgTable('artist_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  artistId: uuid('artist_id').references(() => artists.id).notNull(),
  totalShows: integer('total_shows').default(0),
  totalSetlists: integer('total_setlists').default(0),
  avgSetlistLength: doublePrecision('avg_setlist_length'),
  mostPlayedSong: text('most_played_song'),
  lastShowDate: timestamp('last_show_date'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Venues Schema
```typescript
// packages/database/src/schema/venues.ts
import { 
  pgTable, 
  uuid, 
  text, 
  integer, 
  doublePrecision, 
  timestamp 
} from 'drizzle-orm/pg-core';

export const venues = pgTable('venues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  address: text('address'),
  city: text('city').notNull(),
  state: text('state'),
  country: text('country').notNull(),
  postalCode: text('postal_code'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  timezone: text('timezone').notNull(),
  capacity: integer('capacity'),
  venueType: text('venue_type'), // arena, theater, club, etc.
  phoneNumber: text('phone_number'),
  website: text('website'),
  imageUrl: text('image_url'),
  description: text('description'),
  amenities: text('amenities'), // JSON array
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Shows Schema
```typescript
// packages/database/src/schema/shows.ts
import { 
  pgTable, 
  uuid, 
  text, 
  date, 
  time, 
  integer, 
  boolean, 
  timestamp, 
  doublePrecision, 
  pgEnum 
} from 'drizzle-orm/pg-core';

export const showStatusEnum = pgEnum('show_status', [
  'upcoming', 
  'ongoing', 
  'completed', 
  'cancelled'
]);

export const shows = pgTable('shows', {
  id: uuid('id').primaryKey().defaultRandom(),
  headlinerArtistId: uuid('headliner_artist_id').references(() => artists.id).notNull(),
  venueId: uuid('venue_id').references(() => venues.id),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  date: date('date').notNull(),
  startTime: time('start_time'),
  doorsTime: time('doors_time'),
  status: showStatusEnum('status').default('upcoming').notNull(),
  description: text('description'),
  ticketUrl: text('ticket_url'),
  minPrice: integer('min_price'),
  maxPrice: integer('max_price'),
  currency: text('currency').default('USD'),
  
  // Analytics fields
  viewCount: integer('view_count').default(0),
  attendeeCount: integer('attendee_count').default(0),
  setlistCount: integer('setlist_count').default(0),
  voteCount: integer('vote_count').default(0),
  trendingScore: doublePrecision('trending_score').default(0),
  
  // Featured/promoted content
  isFeatured: boolean('is_featured').default(false),
  isVerified: boolean('is_verified').default(false),
  
  // External integrations
  ticketmasterId: text('ticketmaster_id'),
  setlistFmId: text('setlistfm_id'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const showArtists = pgTable('show_artists', {
  id: uuid('id').primaryKey().defaultRandom(),
  showId: uuid('show_id').references(() => shows.id).notNull(),
  artistId: uuid('artist_id').references(() => artists.id).notNull(),
  orderIndex: integer('order_index').notNull(), // 0 = headliner
  setLength: integer('set_length'), // minutes
  isHeadliner: boolean('is_headliner').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Songs and Setlists Schema
```typescript
// packages/database/src/schema/setlists.ts
import { 
  pgTable, 
  uuid, 
  text, 
  integer, 
  boolean, 
  timestamp, 
  date, 
  pgEnum,
  unique 
} from 'drizzle-orm/pg-core';

export const songs = pgTable('songs', {
  id: uuid('id').primaryKey().defaultRandom(),
  spotifyId: text('spotify_id').unique(),
  title: text('title').notNull(),
  artist: text('artist').notNull(), // Primary artist name
  album: text('album'),
  albumArtUrl: text('album_art_url'),
  releaseDate: date('release_date'),
  durationMs: integer('duration_ms'),
  popularity: integer('popularity').default(0),
  previewUrl: text('preview_url'),
  isExplicit: boolean('is_explicit').default(false),
  isPlayable: boolean('is_playable').default(true),
  acousticness: text('acousticness'), // Spotify audio features
  danceability: text('danceability'),
  energy: text('energy'),
  valence: text('valence'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const setlistTypeEnum = pgEnum('setlist_type', [
  'predicted', 
  'actual'
]);

export const setlists = pgTable('setlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  showId: uuid('show_id').references(() => shows.id).notNull(),
  artistId: uuid('artist_id').references(() => artists.id).notNull(),
  type: setlistTypeEnum('type').notNull(),
  name: text('name').default('Main Set'),
  orderIndex: integer('order_index').default(0),
  isLocked: boolean('is_locked').default(false),
  totalVotes: integer('total_votes').default(0),
  accuracyScore: integer('accuracy_score').default(0), // 0-100
  
  // Import tracking
  importedFrom: text('imported_from'), // 'setlist.fm', 'manual', 'api'
  externalId: text('external_id'),
  importedAt: timestamp('imported_at'),
  
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const setlistSongs = pgTable('setlist_songs', {
  id: uuid('id').primaryKey().defaultRandom(),
  setlistId: uuid('setlist_id').references(() => setlists.id).notNull(),
  songId: uuid('song_id').references(() => songs.id).notNull(),
  position: integer('position').notNull(),
  notes: text('notes'), // "acoustic", "cover", "new song", etc.
  isPlayed: boolean('is_played'), // For actual setlists
  playTime: timestamp('play_time'), // When song was played
  
  // Vote aggregations (denormalized for performance)
  upvotes: integer('upvotes').default(0),
  downvotes: integer('downvotes').default(0),
  netVotes: integer('net_votes').default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueSetlistPosition: unique().on(table.setlistId, table.position),
}));

export const voteTypeEnum = pgEnum('vote_type', ['up', 'down']);

export const votes = pgTable('votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  setlistSongId: uuid('setlist_song_id').references(() => setlistSongs.id).notNull(),
  voteType: voteTypeEnum('vote_type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUserVote: unique().on(table.userId, table.setlistSongId),
}));
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
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  driver: 'pg',
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
import { relations } from 'drizzle-orm';
import {
  users,
  artists,
  venues,
  shows,
  setlists,
  songs,
  setlistSongs,
  votes,
} from '.';

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
import { db } from './client';
import { artists, venues, shows } from './schema';

async function seed() {
  console.log('🌱 Seeding database...');
  
  // Seed sample artists
  const sampleArtists = await db.insert(artists).values([
    {
      name: 'The Strokes',
      slug: 'the-strokes',
      genres: JSON.stringify(['indie rock', 'alternative rock']),
      verified: true,
    },
    // ... more sample data
  ]).returning();
  
  console.log('✅ Database seeded successfully');
}

if (require.main === module) {
  seed().catch(console.error);
}
```

## Real-time Features

### Supabase Real-time Setup
```typescript
// packages/database/src/realtime.ts
import { supabase } from './supabase';

export function subscribeToSetlistUpdates(
  showId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`setlist:${showId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'setlist_songs',
        filter: `setlist_id=in.(${showId})`,
      },
      callback
    )
    .subscribe();
}

export function subscribeToVoteUpdates(
  setlistSongId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`votes:${setlistSongId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `setlist_song_id=eq.${setlistSongId}`,
      },
      callback
    )
    .subscribe();
}
```

## Performance Optimization

### Query Optimization
```typescript
// packages/database/src/queries/shows.ts
import { db } from '../client';
import { shows, artists, venues, setlists } from '../schema';
import { eq, desc, and, sql } from 'drizzle-orm';

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
    .where(eq(shows.status, 'upcoming'))
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

This database schema provides a solid foundation for the TheSet application using Next-Forge's package structure with Supabase integration. The schema is designed for scalability, performance, and real-time features while maintaining type safety through Drizzle ORM.