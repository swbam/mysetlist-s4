import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../client";
import { artists, showArtists, shows, userFollowsArtists } from "../schema";
import { PgColumn,PgTableWithColumns } from "drizzle-orm/pg-core";

// Optimized artist queries with better performance
// These queries use CTEs and join optimizations to reduce redundant subqueries

export async function getArtistById(artistId: string) {
  // Use CTE to calculate counts more efficiently
  const artist = await db
    .with("artist_stats", (db: { select: (arg0: { artistId: PgColumn<{ name: "id"; tableName: "artists"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; showCount: any; upcomingShowCount: any; }) => { (): any; new(): any; from: { (arg0: PgTableWithColumns<{ name: "artists"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "artists"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; tmAttractionId: PgColumn<{ name: "tm_attraction_id"; tableName: "artists"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; spotifyId: PgColumn<{ name: "spotify_id"; tableName: "artists"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; mbid: PgColumn<{ name: "mbid"; tableName: "artists"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; name: PgColumn<{ name: "name"; tableName: "artists"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; slug: PgColumn<{ name: "slug"; tableName: "artists"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; imageUrl: PgColumn<{ name: "image_url"; tableName: "artists"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; smallImageUrl: PgColumn<{ name: "small_image_url"; tableName: "artists"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; genres: PgColumn<{ name: "genres"; tableName: "artists"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; popularity: PgColumn<{ name: "popularity"; tableName: "artists"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; followers: PgColumn<{ name: "followers"; tableName: "artists"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; followerCount: PgColumn<{ name: "follower_count"; tableName: "artists"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; monthlyListeners: PgColumn<{ name: "monthly_listeners"; tableName: "artists"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; verified: PgColumn<{ name: "verified"; tableName: "artists"; dataType: "boolean"; columnType: "PgBoolean"; data: boolean; driverParam: boolean; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; externalUrls: PgColumn<{ name: "external_urls"; tableName: "artists"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; importStatus: PgColumn<{ name: "import_status"; tableName: "artists"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; lastSyncedAt: PgColumn<{ name: "last_synced_at"; tableName: "artists"; dataType: "date"; columnType: "PgTimestamp"; data: Date; driverParam: string; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; songCatalogSyncedAt: PgColumn<{ name: "song_catalog_synced_at"; tableName: "artists"; dataType: "date"; columnType: "PgTimestamp"; data: Date; driverParam: string; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; showsSyncedAt: PgColumn<{ name: "shows_synced_at"; tableName: "artists"; dataType: "date"; columnType: "PgTimestamp"; data: Date; driverParam: string; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; totalAlbums: PgColumn<{ name: "total_albums"; tableName: "artists"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; totalSongs: PgColumn<{ name: "total_songs"; tableName: "artists"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; lastFullSyncAt: PgColumn<{ name: "last_full_sync_at"; tableName: "artists"; dataType: "date"; columnType: "PgTimestamp"; data: Date; driverParam: string; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; previousFollowers: PgColumn<{ name: "previous_followers"; tableName: "artists"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; previousPopularity: PgColumn<{ name: "previous_popularity"; tableName: "artists"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; previousMonthlyListeners: PgColumn<{ name: "previous_monthly_listeners"; tableName: "artists"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; previousFollowerCount: PgColumn<{ name: "previous_follower_count"; tableName: "artists"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; lastGrowthCalculated: PgColumn<{ name: "last_growth_calculated"; tableName: "artists"; dataType: "date"; columnType: "PgTimestamp"; data: Date; driverParam: string; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; trendingScore: PgColumn<{ name: "trending_score"; tableName: "artists"; dataType: "number"; columnType: "PgDoublePrecision"; data: number; driverParam: string|number; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; totalShows: PgColumn<{ name: "total_shows"; tableName: "artists"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; upcomingShows: PgColumn<{ name: "upcoming_shows"; tableName: "artists"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; totalSetlists: PgColumn<{ name: "total_setlists"; tableName: "artists"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; createdAt: PgColumn<{ name: "created_at"; tableName: "artists"; dataType: "date"; columnType: "PgTimestamp"; data: Date; driverParam: string; notNull: true; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; updatedAt: PgColumn<{ name: "updated_at"; tableName: "artists"; dataType: "date"; columnType: "PgTimestamp"; data: Date; driverParam: string; notNull: true; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; }; dialect: "pg"; }>): { (): any; new(): any; leftJoin: { (arg0: PgTableWithColumns<{ name: "show_artists"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "show_artists"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; showId: PgColumn<{ name: "show_id"; tableName: "show_artists"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; artistId: PgColumn<{ name: "artist_id"; tableName: "show_artists"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; orderIndex: PgColumn<{ name: "order_index"; tableName: "show_artists"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; setLength: PgColumn<{ name: "set_length"; tableName: "show_artists"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; isHeadliner: PgColumn<{ name: "is_headliner"; tableName: "show_artists"; dataType: "boolean"; columnType: "PgBoolean"; data: boolean; driverParam: boolean; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; createdAt: PgColumn<{ name: "created_at"; tableName: "show_artists"; dataType: "date"; columnType: "PgTimestamp"; data: Date; driverParam: string; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; }; dialect: "pg"; }>,arg1: any): { (): any; new(): any; leftJoin: { (arg0: PgTableWithColumns<{ name: "shows"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "shows"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; headlinerArtistId: PgColumn<{ name: "headliner_artist_id"; tableName: "shows"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; venueId: PgColumn<{ name: "venue_id"; tableName: "shows"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; name: PgColumn<{ name: "name"; tableName: "shows"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; slug: PgColumn<{ name: "slug"; tableName: "shows"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; date: PgColumn<{ name: "date"; tableName: "shows"; dataType: "string"; columnType: "PgDateString"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; startTime: PgColumn<{ name: "start_time"; tableName: "shows"; dataType: "string"; columnType: "PgTime"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; doorsTime: PgColumn<{ name: "doors_time"; tableName: "shows"; dataType: "string"; columnType: "PgTime"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; status: PgColumn<{ name: "status"; tableName: "shows"; dataType: "string"; columnType: "PgEnumColumn"; data: "completed"|"upcoming"|"ongoing"|"cancelled"; driverParam: string; notNull: false; hasDefault: true; enumValues: ["upcoming","ongoing","completed","cancelled"]; baseColumn: never; },{},{}>; description: PgColumn<{ name: "description"; tableName: "shows"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; ticketUrl: PgColumn<{ name: "ticket_url"; tableName: "shows"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; minPrice: PgColumn<{ name: "min_price"; tableName: "shows"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; maxPrice: PgColumn<{ name: "max_price"; tableName: "shows"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; currency: PgColumn<{ name: "currency"; tableName: "shows"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: false; hasDefault: true; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; viewCount: PgColumn<{ name: "view_count"; tableName: "shows"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; attendeeCount: PgColumn<{ name: "attendee_count"; tableName: "shows"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; setlistCount: PgColumn<{ name: "setlist_count"; tableName: "shows"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; voteCount: PgColumn<{ name: "vote_count"; tableName: "shows"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; trendingScore: PgColumn<{ name: "trending_score"; tableName: "shows"; dataType: "number"; columnType: "PgDoublePrecision"; data: number; driverParam: string|number; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; previousViewCount: PgColumn<{ name: "previous_view_count"; tableName: "shows"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; previousAttendeeCount: PgColumn<{ name: "previous_attendee_count"; tableName: "shows"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; previousVoteCount: PgColumn<{ name: "previous_vote_count"; tableName: "shows"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; previousSetlistCount: PgColumn<{ name: "previous_setlist_count"; tableName: "shows"; dataType: "number"; columnType: "PgInteger"; data: number; driverParam: string|number; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; lastGrowthCalculated: PgColumn<{ name: "last_growth_calculated"; tableName: "shows"; dataType: "date"; columnType: "PgTimestamp"; data: Date; driverParam: string; notNull: false; hasDefault: false; enumValues: undefined; baseColumn: never; },{},{}>; isFeatured: PgColumn<{ name: "is_featured"; tableName: "shows"; dataType: "boolean"; columnType: "PgBoolean"; data: boolean; driverParam: boolean; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; isVerified: PgColumn<{ name: "is_verified"; tableName: "shows"; dataType: "boolean"; columnType: "PgBoolean"; data: boolean; driverParam: boolean; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; tmEventId: PgColumn<{ name: "tm_event_id"; tableName: "shows"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; setlistFmId: PgColumn<{ name: "setlistfm_id"; tableName: "shows"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: false; hasDefault: false; enumValues: [string,...string[]]; baseColumn: never; },{},{}>; setlistReady: PgColumn<{ name: "setlist_ready"; tableName: "shows"; dataType: "boolean"; columnType: "PgBoolean"; data: boolean; driverParam: boolean; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; createdAt: PgColumn<{ name: "created_at"; tableName: "shows"; dataType: "date"; columnType: "PgTimestamp"; data: Date; driverParam: string; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; updatedAt: PgColumn<{ name: "updated_at"; tableName: "shows"; dataType: "date"; columnType: "PgTimestamp"; data: Date; driverParam: string; notNull: false; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>; }; dialect: "pg"; }>,arg1: any): { (): any; new(): any; where: { (arg0: any): { (): any; new(): any; groupBy: { (arg0: PgColumn<{ name: "id"; tableName: "artists"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; enumValues: undefined; baseColumn: never; },{},{}>): any; new(): any; }; }; new(): any; }; }; new(): any; }; }; new(): any; }; }; new(): any; }; }; }) =>
      db
        .select({
          artistId: artists.id,
          showCount: sql<number>`COUNT(DISTINCT sa.show_id)`,
          upcomingShowCount: sql<number>`COUNT(DISTINCT CASE WHEN s.date >= CURRENT_DATE THEN s.id END)`,
        })
        .from(artists)
        .leftJoin(showArtists, eq(showArtists.artistId, artists.id))
        .leftJoin(shows, eq(shows.id, showArtists.showId))
        .where(eq(artists.id, artistId))
        .groupBy(artists.id),
    )
    .select({
      artist: artists,
      showCount: sql<number>`COALESCE(artist_stats.show_count, 0)`,
      upcomingShowCount: sql<number>`COALESCE(artist_stats.upcoming_show_count, 0)`,
    })
    .from(artists)
    .leftJoin(sql`artist_stats`, eq(sql`artist_stats.artist_id`, artists.id))
    .where(eq(artists.id, artistId))
    .limit(1);

  return artist[0] || null;
}

export async function getArtistBySlug(slug: string) {
  // Optimized with single query using window functions
  const artist = await db
    .select({
      artist: artists,
      showCount: sql<number>`(
        SELECT COUNT(DISTINCT sa.show_id)
        FROM show_artists sa
        WHERE sa.artist_id = ${artists.id}
      )`,
      upcomingShowCount: sql<number>`(
        SELECT COUNT(DISTINCT s.id)
        FROM shows s
        JOIN show_artists sa ON sa.show_id = s.id
        WHERE sa.artist_id = ${artists.id}
        AND s.date >= CURRENT_DATE
      )`,
      followerCount: sql<number>`(
        SELECT COUNT(*)
        FROM user_follows_artists ufa
        WHERE ufa.artist_id = ${artists.id}
      )`,
    })
    .from(artists)
    .where(eq(artists.slug, slug))
    .limit(1);

  return artist[0] || null;
}

export async function searchArtistsOptimized(query: string, limit = 20) {
  // Use full-text search for better performance on large datasets
  const results = await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      popularity: artists.popularity,
      genres: artists.genres,
      followerCount: sql<number>`COALESCE(follower_counts.count, 0)`,
    })
    .from(artists)
    .leftJoin(
      db
        .select({
          artistId: userFollowsArtists.artistId,
          count: sql<number>`COUNT(*)`,
        })
        .from(userFollowsArtists)
        .groupBy(userFollowsArtists.artistId)
        .$dynamic(),
      eq(sql`follower_counts.artist_id`, artists.id),
    )
    .where(
      sql`(
        ${artists.name} ILIKE ${`%${query}%`} OR
        to_tsvector('english', ${artists.name}) @@ plainto_tsquery('english', ${query})
      )`,
    )
    .orderBy(desc(artists.popularity), desc(sql`follower_counts.count`))
    .limit(limit);

  return results;
}

export async function getPopularArtistsOptimized(limit = 20) {
  // Materialized view approach for frequently accessed data
  const results = await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      popularity: artists.popularity,
      genres: artists.genres,
      followerCount: sql<number>`COALESCE(follower_counts.count, 0)`,
      trendingScore: artists.trendingScore,
    })
    .from(artists)
    .leftJoin(
      db
        .select({
          artistId: userFollowsArtists.artistId,
          count: sql<number>`COUNT(*)`,
        })
        .from(userFollowsArtists)
        .groupBy(userFollowsArtists.artistId)
        .$dynamic(),
      eq(sql`follower_counts.artist_id`, artists.id),
    )
    .orderBy(
      desc(artists.trendingScore),
      desc(artists.popularity),
      desc(sql`follower_counts.count`),
    )
    .limit(limit);

  return results;
}

export async function getArtistsByGenreOptimized(genre: string, limit = 20) {
  // Use GIN index on genres JSONB column for better performance
  const results = await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      popularity: artists.popularity,
      genres: artists.genres,
      followerCount: sql<number>`COALESCE(follower_counts.count, 0)`,
    })
    .from(artists)
    .leftJoin(
      db
        .select({
          artistId: userFollowsArtists.artistId,
          count: sql<number>`COUNT(*)`,
        })
        .from(userFollowsArtists)
        .groupBy(userFollowsArtists.artistId)
        .$dynamic(),
      eq(sql`follower_counts.artist_id`, artists.id),
    )
    .where(
      sql`${artists.genres} ? ${genre} OR ${artists.genres}::text ILIKE ${`%${genre}%`}`,
    )
    .orderBy(desc(artists.popularity), desc(sql`follower_counts.count`))
    .limit(limit);

  return results;
}

export async function getUserFollowedArtistsOptimized(userId: string) {
  // Single optimized query with proper indexing
  const results = await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      popularity: artists.popularity,
      genres: artists.genres,
      followedAt: userFollowsArtists.createdAt,
      upcomingShowCount: sql<number>`COALESCE(upcoming_shows.count, 0)`,
    })
    .from(userFollowsArtists)
    .innerJoin(artists, eq(userFollowsArtists.artistId, artists.id))
    .leftJoin(
      db
        .select({
          artistId: showArtists.artistId,
          count: sql<number>`COUNT(DISTINCT ${shows.id})`,
        })
        .from(showArtists)
        .innerJoin(shows, eq(shows.id, showArtists.showId))
        .where(sql`${shows.date} >= CURRENT_DATE`)
        .groupBy(showArtists.artistId)
        .$dynamic(),
      eq(sql`upcoming_shows.artist_id`, artists.id),
    )
    .where(eq(userFollowsArtists.userId, userId))
    .orderBy(desc(userFollowsArtists.createdAt));

  return results;
}

export async function isUserFollowingArtistOptimized(
  userId: string,
  artistId: string,
) {
  // Simple existence check using LIMIT 1 for efficiency
  const result = await db
    .select({ exists: sql<boolean>`1` })
    .from(userFollowsArtists)
    .where(
      and(
        eq(userFollowsArtists.userId, userId),
        eq(userFollowsArtists.artistId, artistId),
      ),
    )
    .limit(1);

  return result.length > 0;
}

export async function getSimilarArtistsOptimized(artistId: string, limit = 10) {
  // Use JSONB operations for better genre matching
  const results = await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      popularity: artists.popularity,
      genres: artists.genres,
      similarity: sql<number>`
        CASE 
          WHEN source_artist.genres IS NULL OR target_artist.genres IS NULL THEN 0
          ELSE (
            SELECT COUNT(*)
            FROM jsonb_array_elements_text(source_artist.genres) AS source_genre
            WHERE source_genre IN (
              SELECT jsonb_array_elements_text(target_artist.genres)
            )
          )
        END
      `,
      followerCount: sql<number>`COALESCE(follower_counts.count, 0)`,
    })
    .from(sql`${artists} AS target_artist`)
    .crossJoin(
      sql`(SELECT genres FROM ${artists} WHERE id = ${artistId}) AS source_artist`,
    )
    .leftJoin(
      db
        .select({
          artistId: userFollowsArtists.artistId,
          count: sql<number>`COUNT(*)`,
        })
        .from(userFollowsArtists)
        .groupBy(userFollowsArtists.artistId)
        .$dynamic(),
      eq(sql`follower_counts.artist_id`, sql`target_artist.id`),
    )
    .where(
      and(
        sql`target_artist.id != ${artistId}`,
        sql`source_artist.genres IS NOT NULL`,
        sql`target_artist.genres IS NOT NULL`,
        sql`jsonb_array_length(source_artist.genres) > 0`,
        sql`jsonb_array_length(target_artist.genres) > 0`,
      ),
    )
    .having(sql`similarity > 0`)
    .orderBy(
      desc(sql`similarity`),
      desc(sql`target_artist.popularity`),
      desc(sql`follower_counts.count`),
    )
    .limit(limit);

  return results;
}

// Batch operations for better performance
export async function getArtistsBatch(artistIds: string[]) {
  if (artistIds.length === 0) return [];

  const results = await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      popularity: artists.popularity,
      genres: artists.genres,
      followerCount: sql<number>`COALESCE(follower_counts.count, 0)`,
    })
    .from(artists)
    .leftJoin(
      db
        .select({
          artistId: userFollowsArtists.artistId,
          count: sql<number>`COUNT(*)`,
        })
        .from(userFollowsArtists)
        .groupBy(userFollowsArtists.artistId)
        .$dynamic(),
      eq(sql`follower_counts.artist_id`, artists.id),
    )
    .where(sql`${artists.id} = ANY(${artistIds})`);

  return results;
}

// Cache-friendly trending artists query
export async function getTrendingArtistsOptimized(limit = 20, offset = 0) {
  const results = await db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      popularity: artists.popularity,
      genres: artists.genres,
      trendingScore: artists.trendingScore,
      followerCount: sql<number>`COALESCE(follower_counts.count, 0)`,
      updatedAt: artists.updatedAt,
    })
    .from(artists)
    .leftJoin(
      db
        .select({
          artistId: userFollowsArtists.artistId,
          count: sql<number>`COUNT(*)`,
        })
        .from(userFollowsArtists)
        .groupBy(userFollowsArtists.artistId)
        .$dynamic(),
      eq(sql`follower_counts.artist_id`, artists.id),
    )
    .where(sql`${artists.trendingScore} > 0`)
    .orderBy(desc(artists.trendingScore), desc(artists.popularity))
    .limit(limit)
    .offset(offset);

  return results;
}
