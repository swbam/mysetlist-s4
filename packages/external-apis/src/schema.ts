import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  date,
  time,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const artists = pgTable('artists', {
  id: uuid('id').primaryKey().defaultRandom(),
  spotifyId: text('spotify_id').unique(),
  ticketmasterId: text('ticketmaster_id').unique(),
  mbid: text('mbid').unique(), // MusicBrainz ID for Setlist.fm
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
  totalAlbums: integer('total_albums').default(0),
  totalSongs: integer('total_songs').default(0),
  lastFullSyncAt: timestamp('last_full_sync_at'),
  trendingScore: doublePrecision('trending_score').default(0),
  totalShows: integer('total_shows').default(0),
  upcomingShows: integer('upcoming_shows').default(0),
  totalSetlists: integer('total_setlists').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

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

export const artistSongs = pgTable('artist_songs', {
  id: uuid('id').primaryKey().defaultRandom(),
  artistId: uuid('artist_id')
    .references(() => artists.id, { onDelete: 'cascade' })
    .notNull(),
  songId: uuid('song_id')
    .references(() => songs.id, { onDelete: 'cascade' })
    .notNull(),
  isPrimaryArtist: boolean('is_primary_artist').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

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
  venueType: text('venue_type'),
  phoneNumber: text('phone_number'),
  website: text('website'),
  imageUrl: text('image_url'),
  description: text('description'),
  amenities: text('amenities'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const showStatusEnum = pgEnum('show_status', [
  'upcoming',
  'ongoing',
  'completed',
  'cancelled',
]);

export const shows = pgTable('shows', {
  id: uuid('id').primaryKey().defaultRandom(),
  headlinerArtistId: uuid('headliner_artist_id')
    .references(() => artists.id, { onDelete: 'cascade' })
    .notNull(),
  venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'set null' }),
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
  viewCount: integer('view_count').default(0),
  attendeeCount: integer('attendee_count').default(0),
  setlistCount: integer('setlist_count').default(0),
  voteCount: integer('vote_count').default(0),
  trendingScore: doublePrecision('trending_score').default(0),
  // External API IDs
  ticketmasterId: text('ticketmaster_id').unique(),
  setlistFmId: text('setlistfm_id').unique(),
  isVerified: boolean('is_verified').default(false),
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
  accuracyScore: integer('accuracy_score').default(0),
  importedFrom: text('imported_from'),
  externalId: text('external_id'),
  importedAt: timestamp('imported_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const setlistSongs = pgTable('setlist_songs', {
  id: uuid('id').primaryKey().defaultRandom(),
  setlistId: uuid('setlist_id')
    .references(() => setlists.id)
    .notNull(),
  songId: uuid('song_id')
    .references(() => songs.id)
    .notNull(),
  position: integer('position').notNull(),
  notes: text('notes'),
  isPlayed: boolean('is_played'),
  playTime: timestamp('play_time'),
  upvotes: integer('upvotes').default(0),
  downvotes: integer('downvotes').default(0),
  netVotes: integer('net_votes').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const showArtists = pgTable('show_artists', {
  id: uuid('id').primaryKey().defaultRandom(),
  showId: uuid('show_id')
    .references(() => shows.id, { onDelete: 'cascade' })
    .notNull(),
  artistId: uuid('artist_id')
    .references(() => artists.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role').default('headliner'), // 'headliner', 'support', 'opener'
  orderIndex: integer('order_index').default(0),
  isHeadliner: boolean('is_headliner').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});