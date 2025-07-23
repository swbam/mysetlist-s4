import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '../client';
import { artists } from '../schema';

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
      )`,
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
      followerCount: sql<number>`0`, // user_follows_artists table removed
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
      followerCount: sql<number>`0`, // user_follows_artists table removed
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
      followerCount: sql<number>`0`, // user_follows_artists table removed
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
      followerCount: sql<number>`0`, // user_follows_artists table removed
    })
    .from(artists)
    .where(sql`${artists.genres}::text ILIKE ${`%${genre}%`}`)
    .orderBy(desc(artists.popularity))
    .limit(limit);

  return results;
}

export async function getUserFollowedArtists(userId: string) {
  // userFollowsArtists table has been removed - return empty array
  return [];
}

export async function isUserFollowingArtist(userId: string, artistId: string) {
  // userFollowsArtists table has been removed - return false
  return false;
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
  const genreConditions = genres.map(
    (genre) => sql`${artists.genres}::text ILIKE ${`%${genre}%`}`
  );

  const results = await db
    .select({
      artist: artists,
      followerCount: sql<number>`0`, // user_follows_artists table removed
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
