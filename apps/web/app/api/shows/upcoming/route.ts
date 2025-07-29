import { artists, db, shows, venues } from "@repo/database";
import { asc, desc, eq, gte, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const offset = Number.parseInt(searchParams.get("offset") || "0");
    const filter = searchParams.get("filter") || "all"; // all, popular, nearby

    // Note: Following filter removed since userFollowsArtists table doesn't exist
    // Only support 'all' and 'popular' filters now
    const actualFilter = filter === "following" ? "all" : filter;

    // Build the query - simplified without following logic
    const baseQuery = db
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
      })
      .from(shows)
      .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(gte(shows.date, new Date().toISOString().split("T")[0]!));

    const upcomingShows = await (actualFilter === "popular"
      ? baseQuery.orderBy(desc(artists.trendingScore))
      : baseQuery.orderBy(asc(shows.date)))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(shows)
      .where(gte(shows.date, new Date().toISOString().split("T")[0]!));

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
      { error: "Failed to fetch upcoming shows" },
      { status: 500 },
    );
  }
}
