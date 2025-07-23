import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

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