import {
  boolean,
  inet,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { artists } from './artists';
import { users } from './users';

// Search analytics table
export const searchAnalytics = pgTable('search_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  sessionId: varchar('session_id', { length: 255 }),
  query: text('query').notNull(),
  searchType: varchar('search_type', { length: 50 }).notNull(), // 'artist', 'venue', 'show', 'global'
  resultsCount: integer('results_count').default(0),
  responseTimeMs: integer('response_time_ms'),
  clickedResultId: uuid('clicked_result_id'),
  clickedResultType: varchar('clicked_result_type', { length: 50 }),
  clickedResultPosition: integer('clicked_result_position'),
  searchTimestamp: timestamp('search_timestamp').defaultNow().notNull(),
  userAgent: text('user_agent'),
  ipAddress: inet('ip_address'),
  metadata: jsonb('metadata'),
});

// Saved searches table
export const savedSearches = pgTable(
  'saved_searches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    query: text('query').notNull(),
    searchType: varchar('search_type', { length: 50 }).notNull(),
    filters: jsonb('filters'),
    notificationEnabled: boolean('notification_enabled').default(false),
    lastChecked: timestamp('last_checked').defaultNow(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserName: unique().on(table.userId, table.name),
  })
);

// Popular searches table
export const popularSearches = pgTable(
  'popular_searches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    query: text('query').notNull(),
    searchType: varchar('search_type', { length: 50 }).notNull(),
    count: integer('count').default(1),
    lastSearched: timestamp('last_searched').defaultNow(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueQueryType: unique().on(table.query, table.searchType),
  })
);

// Artist followers table
export const artistFollowers = pgTable(
  'artist_followers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artistId: uuid('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followedAt: timestamp('followed_at').defaultNow().notNull(),
    notificationEnabled: boolean('notification_enabled').default(true),
  },
  (table) => ({
    uniqueArtistUser: unique().on(table.artistId, table.userId),
  })
);

// User bans table
export const userBans = pgTable('user_bans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  bannedBy: uuid('banned_by')
    .notNull()
    .references(() => users.id),
  reason: text('reason').notNull(),
  banType: varchar('ban_type', { length: 50 }).default('temporary'), // 'temporary', 'permanent'
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  liftedAt: timestamp('lifted_at'),
  liftedBy: uuid('lifted_by').references(() => users.id),
  liftReason: text('lift_reason'),
});
