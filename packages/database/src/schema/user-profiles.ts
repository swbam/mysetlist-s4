import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .unique()
    .notNull(),

  // Profile information
  bio: text('bio'),
  location: text('location'),
  favoriteGenres: text('favorite_genres'), // JSON array

  // Social links
  instagramUrl: text('instagram_url'),
  twitterUrl: text('twitter_url'),
  spotifyUrl: text('spotify_url'),

  // Profile settings
  isPublic: boolean('is_public').default(true).notNull(),
  showAttendedShows: boolean('show_attended_shows').default(true).notNull(),
  showVotedSongs: boolean('show_voted_songs').default(true).notNull(),

  // Statistics
  showsAttended: integer('shows_attended').default(0).notNull(),
  songsVoted: integer('songs_voted').default(0).notNull(),
  artistsFollowed: integer('artists_followed').default(0).notNull(),

  // Avatar
  avatarUrl: text('avatar_url'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
