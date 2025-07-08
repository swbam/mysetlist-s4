import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { artists } from './artists';
import { users } from './users';

export const userFollowsArtists = pgTable('user_follows_artists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  artistId: uuid('artist_id')
    .references(() => artists.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
