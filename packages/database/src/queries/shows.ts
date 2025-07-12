import { and, asc, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { db } from '../client';
import {
  artists,
  showArtists,
  shows,
  userShowAttendance,
  venues,
} from '../schema';

export async function getShowById(showId: string) {
  const result = await db
    .select({
      show: shows,
      artist: artists,
      venue: venues,
      attendanceCount: sql<number>`(
        SELECT COUNT(*)
        FROM user_show_attendance usa
        WHERE usa.show_id = ${shows.id}
        AND usa.status IN ('going', 'interested')
      )`,
    })
    .from(shows)
    .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(eq(shows.id, showId))
    .limit(1);

  return result[0] || null;
}

export async function getShowBySlug(slug: string) {
  const result = await db
    .select({
      show: shows,
      artist: artists,
      venue: venues,
      attendanceCount: sql<number>`(
        SELECT COUNT(*)
        FROM user_show_attendance usa
        WHERE usa.show_id = ${shows.id}
        AND usa.status IN ('going', 'interested')
      )`,
    })
    .from(shows)
    .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(eq(shows.slug, slug))
    .limit(1);

  return result[0] || null;
}

export async function getUpcomingShows(options?: {
  limit?: number;
  offset?: number;
  city?: string;
  genre?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const {
    limit = 20,
    offset = 0,
    city,
    genre,
    startDate,
    endDate,
  } = options || {};

  // Build all conditions upfront
  const conditions = [gte(shows.date, new Date().toISOString())];

  if (city && venues.city) {
    conditions.push(ilike(venues.city, `%${city}%`));
  }

  if (genre) {
    conditions.push(sql`${artists.genres}::text ILIKE ${`%${genre}%`}`);
  }

  if (startDate) {
    conditions.push(gte(shows.date, startDate.toISOString()));
  }

  if (endDate) {
    conditions.push(lte(shows.date, endDate.toISOString()));
  }

  const results = await db
    .select({
      show: shows,
      artist: artists,
      venue: venues,
      attendanceCount: sql<number>`(
        SELECT COUNT(*)
        FROM user_show_attendance usa
        WHERE usa.show_id = ${shows.id}
        AND usa.status IN ('going', 'interested')
      )`,
    })
    .from(shows)
    .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(and(...conditions))
    .orderBy(asc(shows.date))
    .limit(limit)
    .offset(offset);

  return results;
}

export async function getShowsByArtist(
  artistId: string,
  options?: {
    limit?: number;
    onlyUpcoming?: boolean;
  }
) {
  const { limit = 50, onlyUpcoming = false } = options || {};

  const conditions = [eq(showArtists.artistId, artistId)];

  if (onlyUpcoming) {
    conditions.push(gte(shows.date, new Date().toISOString()));
  }

  const results = await db
    .select({
      show: shows,
      artist: artists,
      venue: venues,
    })
    .from(shows)
    .innerJoin(showArtists, eq(shows.id, showArtists.showId))
    .innerJoin(artists, eq(showArtists.artistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(and(...conditions))
    .orderBy(desc(shows.date))
    .limit(limit);

  return results;
}

export async function getShowsByVenue(
  venueId: string,
  options?: {
    limit?: number;
    onlyUpcoming?: boolean;
  }
) {
  const { limit = 50, onlyUpcoming = false } = options || {};

  const conditions = [eq(shows.venueId, venueId)];

  if (onlyUpcoming) {
    conditions.push(gte(shows.date, new Date().toISOString()));
  }

  const results = await db
    .select({
      show: shows,
      artist: artists,
      venue: venues,
    })
    .from(shows)
    .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(and(...conditions))
    .orderBy(desc(shows.date))
    .limit(limit);

  return results;
}

export async function getUserAttendingShows(
  userId: string,
  options?: {
    limit?: number;
    onlyUpcoming?: boolean;
    status?: 'going' | 'interested' | 'not_going';
  }
) {
  const { limit = 50, onlyUpcoming = false, status } = options || {};

  const conditions = [eq(userShowAttendance.userId, userId)];

  if (onlyUpcoming) {
    conditions.push(gte(shows.date, new Date().toISOString()));
  }

  if (status) {
    conditions.push(eq(userShowAttendance.status, status));
  }

  const results = await db
    .select({
      show: shows,
      artist: artists,
      venue: venues,
      attendance: userShowAttendance,
    })
    .from(userShowAttendance)
    .innerJoin(shows, eq(userShowAttendance.showId, shows.id))
    .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(and(...conditions))
    .orderBy(asc(shows.date))
    .limit(limit);

  return results;
}

export async function searchShows(
  query: string,
  options?: {
    limit?: number;
    onlyUpcoming?: boolean;
  }
) {
  const { limit = 20, onlyUpcoming = true } = options || {};

  const searchConditions = or(
    ilike(shows.name, `%${query}%`),
    ilike(artists.name, `%${query}%`),
    venues.name ? ilike(venues.name, `%${query}%`) : undefined
  );

  const conditions = [searchConditions];

  if (onlyUpcoming) {
    conditions.push(gte(shows.date, new Date().toISOString()));
  }

  const results = await db
    .select({
      show: shows,
      artist: artists,
      venue: venues,
    })
    .from(shows)
    .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(and(...conditions))
    .orderBy(asc(shows.date))
    .limit(limit);

  return results;
}

export async function getShowAttendanceCounts(showId: string) {
  const counts = await db
    .select({
      status: userShowAttendance.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(userShowAttendance)
    .where(eq(userShowAttendance.showId, showId))
    .groupBy(userShowAttendance.status);

  const result = {
    going: 0,
    interested: 0,
    not_going: 0,
  };

  counts.forEach(({ status, count }) => {
    result[status] = count;
  });

  return result;
}
