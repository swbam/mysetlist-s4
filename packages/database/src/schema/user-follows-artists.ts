import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { artists } from './artists';

export const userFollowsArtists = pgTable('user_follows_artists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  artistId: uuid('artist_id').references(() => artists.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});