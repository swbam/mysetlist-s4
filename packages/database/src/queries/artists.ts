import { db } from '../client';
import { artists, shows, showArtists, userFollowsArtists } from '../schema';
import { eq, sql, desc, asc, and, ilike, gte } from 'drizzle-orm';

export async function getArtistById(artistId: string) {
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
      )`
    })
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);

  return artist[0] || null;
}

export async function getArtistBySlug(slug: string) {
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
      )`
    })
    .from(artists)
    .where(eq(artists.slug, slug))
    .limit(1);

  return artist[0] || null;
}

export async function searchArtists(query: string, limit = 20) {
  const results = await db
    .select({
      artist: artists,
      followerCount: sql<number>`(
        SELECT COUNT(*)
        FROM user_follows_artists ufa
        WHERE ufa.artist_id = ${artists.id}
      )`
    })
    .from(artists)
    .where(ilike(artists.name, `%${query}%`))
    .orderBy(desc(artists.popularity))
    .limit(limit);

  return results;
}

export async function getPopularArtists(limit = 20) {
  const results = await db
    .select({
      artist: artists,
      followerCount: sql<number>`(
        SELECT COUNT(*)
        FROM user_follows_artists ufa
        WHERE ufa.artist_id = ${artists.id}
      )`
    })
    .from(artists)
    .orderBy(desc(artists.popularity))
    .limit(limit);

  return results;
}

export async function getArtistsByGenre(genre: string, limit = 20) {
  const results = await db
    .select({
      artist: artists,
      followerCount: sql<number>`(
        SELECT COUNT(*)
        FROM user_follows_artists ufa
        WHERE ufa.artist_id = ${artists.id}
      )`
    })
    .from(artists)
    .where(sql`${artists.genres}::text ILIKE ${'%' + genre + '%'}`)
    .orderBy(desc(artists.popularity))
    .limit(limit);

  return results;
}

export async function getUserFollowedArtists(userId: string) {
  const results = await db
    .select({
      artist: artists,
      followedAt: userFollowsArtists.createdAt,
      upcomingShowCount: sql<number>`(
        SELECT COUNT(DISTINCT s.id)
        FROM shows s
        JOIN show_artists sa ON sa.show_id = s.id
        WHERE sa.artist_id = ${artists.id}
        AND s.date >= CURRENT_DATE
      )`
    })
    .from(userFollowsArtists)
    .innerJoin(artists, eq(userFollowsArtists.artistId, artists.id))
    .where(eq(userFollowsArtists.userId, userId))
    .orderBy(desc(userFollowsArtists.createdAt));

  return results;
}

export async function isUserFollowingArtist(userId: string, artistId: string) {
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(userFollowsArtists)
    .where(
      and(
        eq(userFollowsArtists.userId, userId),
        eq(userFollowsArtists.artistId, artistId)
      )
    );

  return result[0].count > 0;
}

export async function getSimilarArtists(artistId: string, limit = 10) {
  // Get the artist's genres
  const artist = await db
    .select({ genres: artists.genres })
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);

  if (!artist[0] || !artist[0].genres) {
    return [];
  }

  const genres = JSON.parse(artist[0].genres as string);
  if (!Array.isArray(genres) || genres.length === 0) {
    return [];
  }

  // Find artists with similar genres
  const genreConditions = genres.map(genre => 
    sql`${artists.genres}::text ILIKE ${'%' + genre + '%'}`
  );

  const results = await db
    .select({
      artist: artists,
      followerCount: sql<number>`(
        SELECT COUNT(*)
        FROM user_follows_artists ufa
        WHERE ufa.artist_id = ${artists.id}
      )`
    })
    .from(artists)
    .where(
      and(
        sql`${artists.id} != ${artistId}`,
        sql`(${genreConditions.reduce((acc, cond) => sql`${acc} OR ${cond}`)})`
      )
    )
    .orderBy(desc(artists.popularity))
    .limit(limit);

  return results;
}