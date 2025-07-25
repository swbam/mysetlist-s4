import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '../client';
import { artists, userFollowsArtists, shows, showArtists } from '../schema';

// Optimized artist queries with better performance
// These queries use CTEs and join optimizations to reduce redundant subqueries

export async function getArtistById(artistId: string) {
  // Use CTE to calculate counts more efficiently
  const artist = await db
    .with('artist_stats', db => db
      .select({
        artistId: artists.id,
        showCount: sql<number>`COUNT(DISTINCT sa.show_id)`,
        upcomingShowCount: sql<number>`COUNT(DISTINCT CASE WHEN s.date >= CURRENT_DATE THEN s.id END)`,
      })
      .from(artists)
      .leftJoin(showArtists, eq(showArtists.artistId, artists.id))
      .leftJoin(shows, eq(shows.id, showArtists.showId))
      .where(eq(artists.id, artistId))
      .groupBy(artists.id)
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
      eq(sql`follower_counts.artist_id`, artists.id)
    )
    .where(
      sql`(
        ${artists.name} ILIKE ${`%${query}%`} OR
        to_tsvector('english', ${artists.name}) @@ plainto_tsquery('english', ${query})
      )`
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
      eq(sql`follower_counts.artist_id`, artists.id)
    )
    .orderBy(
      desc(artists.trendingScore),
      desc(artists.popularity),
      desc(sql`follower_counts.count`)
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
      eq(sql`follower_counts.artist_id`, artists.id)
    )
    .where(sql`${artists.genres} ? ${genre} OR ${artists.genres}::text ILIKE ${`%${genre}%`}`)
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
      eq(sql`upcoming_shows.artist_id`, artists.id)
    )
    .where(eq(userFollowsArtists.userId, userId))
    .orderBy(desc(userFollowsArtists.createdAt));

  return results;
}

export async function isUserFollowingArtistOptimized(userId: string, artistId: string) {
  // Simple existence check using LIMIT 1 for efficiency
  const result = await db
    .select({ exists: sql<boolean>`1` })
    .from(userFollowsArtists)
    .where(
      and(
        eq(userFollowsArtists.userId, userId),
        eq(userFollowsArtists.artistId, artistId)
      )
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
    .crossJoin(sql`(SELECT genres FROM ${artists} WHERE id = ${artistId}) AS source_artist`)
    .leftJoin(
      db
        .select({
          artistId: userFollowsArtists.artistId,
          count: sql<number>`COUNT(*)`,
        })
        .from(userFollowsArtists)
        .groupBy(userFollowsArtists.artistId)
        .$dynamic(),
      eq(sql`follower_counts.artist_id`, sql`target_artist.id`)
    )
    .where(
      and(
        sql`target_artist.id != ${artistId}`,
        sql`source_artist.genres IS NOT NULL`,
        sql`target_artist.genres IS NOT NULL`,
        sql`jsonb_array_length(source_artist.genres) > 0`,
        sql`jsonb_array_length(target_artist.genres) > 0`
      )
    )
    .having(sql`similarity > 0`)
    .orderBy(
      desc(sql`similarity`),
      desc(sql`target_artist.popularity`),
      desc(sql`follower_counts.count`)
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
      eq(sql`follower_counts.artist_id`, artists.id)
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
      eq(sql`follower_counts.artist_id`, artists.id)
    )
    .where(sql`${artists.trendingScore} > 0`)
    .orderBy(
      desc(artists.trendingScore),
      desc(artists.popularity)
    )
    .limit(limit)
    .offset(offset);

  return results;
}