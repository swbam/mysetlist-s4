import { getUserFromRequest } from '@repo/auth/server';
import {
  artistStats,
  artists,
  db,
  shows,
  userFollowsArtists,
  venues,
} from '@repo/database';
import { and, asc, desc, eq, gte, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const offset = Number.parseInt(searchParams.get('offset') || '0');
    const filter = searchParams.get('filter') || 'all'; // all, following, nearby
    const sortBy = searchParams.get('sortBy') || 'date'; // date, popularity, trending

    const user = await getUserFromRequest(request);

    let query = db
      .select({
        id: shows.id,
        name: shows.name,
        slug: shows.slug,
        date: shows.date,
        startTime: shows.startTime,
        ticketUrl: shows.ticketUrl,
        artist: {
          id: artists.id,
          name: artists.name,
          slug: artists.slug,
          imageUrl: artists.imageUrl,
          genres: artists.genres,
        },
        venue: {
          id: venues.id,
          name: venues.name,
          slug: venues.slug,
          city: venues.city,
          state: venues.state,
          country: venues.country,
          latitude: venues.latitude,
          longitude: venues.longitude,
        },
        isFollowing: user
          ? sql<boolean>`EXISTS (
              SELECT 1 FROM ${userFollowsArtists} 
              WHERE ${userFollowsArtists.artistId} = ${artists.id} 
              AND ${userFollowsArtists.userId} = ${user.id}
            )`
          : sql<boolean>`false`,
      })
      .from(shows)
      .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(gte(shows.date, new Date()));

    // Apply filters
    if (filter === 'following' && user) {
      query = query.where(
        and(
          gte(shows.date, new Date()),
          exists(
            db
              .select()
              .from(userFollowsArtists)
              .where(
                and(
                  eq(userFollowsArtists.artistId, artists.id),
                  eq(userFollowsArtists.userId, user.id)
                )
              )
          )
        )
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'popularity':
        query = query
          .leftJoin(artistStats, eq(artists.id, artistStats.artistId))
          .orderBy(desc(artistStats.followerCount), asc(shows.date));
        break;
      case 'trending':
        query = query
          .leftJoin(artistStats, eq(artists.id, artistStats.artistId))
          .orderBy(desc(artistStats.trendingScore), asc(shows.date));
        break;
      default:
        query = query.orderBy(asc(shows.date));
    }

    // Apply pagination
    query = query.limit(limit).offset(offset);

    const upcomingShows = await query;

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(shows)
      .where(gte(shows.date, new Date()));

    return NextResponse.json({
      shows: upcomingShows,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count,
      },
    });
  } catch (error) {
    console.error('Error fetching upcoming shows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming shows' },
      { status: 500 }
    );
  }
}

function exists(subquery: any) {
  return sql`EXISTS (${subquery})`;
}
