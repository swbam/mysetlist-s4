import { pgTable, uuid, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users';
import { artists } from './artists';

// Temporary table definition to fix the relations error
// This table is scheduled for removal but needed for backwards compatibility
export const userFollowsArtists = pgTable(
  'user_follows_artists',
  {
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    artistId: uuid('artist_id')
      .references(() => artists.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.artistId] }),
  })
);