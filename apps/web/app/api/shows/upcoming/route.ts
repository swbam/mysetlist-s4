import { getUserFromRequest } from '@repo/auth/server';
import {
  artists,
  db,
  shows,
  userFollowsArtists,
  venues,
} from '@repo/database';
import { and, asc, eq, exists, gte, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const offset = Number.parseInt(searchParams.get('offset') || '0');
    const filter = searchParams.get('filter') || 'all'; // all, following, nearby

    const user = await getUserFromRequest(request);

    // Build the query with all clauses at once to avoid TypeScript issues
    const upcomingShows = await db
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
      .where(
        filter === 'following' && user
          ? and(
              gte(shows.date, new Date().toISOString().substring(0, 10)),
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
          : gte(shows.date, new Date().toISOString().substring(0, 10))
      )
      .orderBy(asc(shows.date))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(shows)
      .where(gte(shows.date, new Date().toISOString().substring(0, 10)));
    
    const count = countResult[0]?.count || 0;

    return NextResponse.json({
      shows: upcomingShows,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count,
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch upcoming shows' },
      { status: 500 }
    );
  }
}

