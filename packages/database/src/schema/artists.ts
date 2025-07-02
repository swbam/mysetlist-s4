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
  followers: integer('followers').default(0), // Spotify followers
  followerCount: integer('follower_count').default(0), // App followers
  monthlyListeners: integer('monthly_listeners'),
  verified: boolean('verified').default(false),
  bio: text('bio'),
  externalUrls: text('external_urls'), // JSON object
  lastSyncedAt: timestamp('last_synced_at'),
  songCatalogSyncedAt: timestamp('song_catalog_synced_at'),
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