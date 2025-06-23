import { 
  pgTable, 
  uuid, 
  text, 
  timestamp, 
  boolean, 
  pgEnum,
  integer,
  unique 
} from 'drizzle-orm/pg-core';
import { artists } from './artists';

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

export const userFollowsArtists = pgTable('user_follows_artists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  artistId: uuid('artist_id').references(() => artists.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUserArtist: unique().on(table.userId, table.artistId),
}));