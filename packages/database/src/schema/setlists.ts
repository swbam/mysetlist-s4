import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { artists } from './artists';
import { shows } from './shows';
import { users } from './users';

export const songs = pgTable('songs', {
  id: uuid('id').primaryKey().defaultRandom(),
  spotifyId: text('spotify_id').unique(),
  title: text('title').notNull(),
  artist: text('artist').notNull(), // Primary artist name
  album: text('album'),
  albumId: text('album_id'),
  trackNumber: integer('track_number'),
  discNumber: integer('disc_number').default(1),
  albumType: text('album_type'), // 'album', 'single', 'compilation'
  albumArtUrl: text('album_art_url'),
  releaseDate: date('release_date'),
  durationMs: integer('duration_ms'),
  popularity: integer('popularity').default(0),
  previewUrl: text('preview_url'),
  spotifyUri: text('spotify_uri'),
  externalUrls: text('external_urls'), // JSON object
  isExplicit: boolean('is_explicit').default(false),
  isPlayable: boolean('is_playable').default(true),
  acousticness: text('acousticness'), // Spotify audio features
  danceability: text('danceability'),
  energy: text('energy'),
  valence: text('valence'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const setlistTypeEnum = pgEnum('setlist_type', ['predicted', 'actual']);

export const setlists = pgTable('setlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  showId: uuid('show_id')
    .references(() => shows.id)
    .notNull(),
  artistId: uuid('artist_id')
    .references(() => artists.id)
    .notNull(),
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

export const setlistSongs = pgTable(
  'setlist_songs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    setlistId: uuid('setlist_id')
      .references(() => setlists.id)
      .notNull(),
    songId: uuid('song_id')
      .references(() => songs.id)
      .notNull(),
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
  },
  (table) => ({
    uniqueSetlistPosition: unique().on(table.setlistId, table.position),
  })
);

export const voteTypeEnum = pgEnum('vote_type', ['up', 'down']);

export const votes = pgTable(
  'votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    setlistSongId: uuid('setlist_song_id')
      .references(() => setlistSongs.id)
      .notNull(),
    voteType: voteTypeEnum('vote_type').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserVote: unique().on(table.userId, table.setlistSongId),
  })
);
