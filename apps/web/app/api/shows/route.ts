import { artists, db, shows, venues, showArtists } from "@repo/database";
import { and, asc, desc, eq, gte, lte, ilike, sql, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const offset = Number.parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status") || "upcoming";
    const city = searchParams.get("city");
    const artistId = searchParams.get("artistId");
    const venueId = searchParams.get("venueId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const featured = searchParams.get("featured") === "true";
    const orderBy = searchParams.get("orderBy") || "date";

    // Build base query with joins
    let query = db
      .select({
        id: shows.id,
        name: shows.name,
        slug: shows.slug,
        date: shows.date,
        startTime: shows.startTime,
        doorsTime: shows.doorsTime,
        status: shows.status,
        description: shows.description,
        ticketUrl: shows.ticketUrl,
        minPrice: shows.minPrice,
        maxPrice: shows.maxPrice,
        currency: shows.currency,
        viewCount: shows.viewCount,
        attendeeCount: shows.attendeeCount,
        setlistCount: shows.setlistCount,
        voteCount: shows.voteCount,
        trendingScore: shows.trendingScore,
        isFeatured: shows.isFeatured,
        isVerified: shows.isVerified,
        headlinerArtist: {
          id: artists.id,
          name: artists.name,
          slug: artists.slug,
          imageUrl: artists.imageUrl,
          genres: artists.genres,
          verified: artists.verified,
        },
        venue: {
          id: venues.id,
          name: venues.name,
          slug: venues.slug,
          city: venues.city,
          state: venues.state,
          country: venues.country,
          capacity: venues.capacity,
        },
      })
      .from(shows)
      .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .leftJoin(venues, eq(shows.venueId, venues.id));

    // Apply filters
    const conditions = [];

    if (status) {
      conditions.push(eq(shows.status, status));
    }

    if (artistId) {
      conditions.push(eq(shows.headlinerArtistId, artistId));
    }

    if (venueId) {
      conditions.push(eq(shows.venueId, venueId));
    }

    if (dateFrom) {
      conditions.push(gte(shows.date, dateFrom));
    }

    if (dateTo) {
      conditions.push(lte(shows.date, dateTo));
    }

    if (featured) {
      conditions.push(eq(shows.isFeatured, true));
    }

    if (city) {
      conditions.push(ilike(venues.city, `%${city}%`));
    }

    // Default to upcoming shows if no specific status filter
    if (!status) {
      conditions.push(
        gte(shows.date, new Date().toISOString().substring(0, 10)),
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply ordering
    switch (orderBy) {
      case "trending":
        query = query.orderBy(desc(shows.trendingScore));
        break;
      case "popularity":
        query = query.orderBy(desc(shows.viewCount));
        break;
      default:
        query = query.orderBy(asc(shows.date));
        break;
    }

    // Apply pagination
    query = query.limit(limit).offset(offset);

    // Execute query
    const showsData = await query;

    // Get total count for pagination
    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(shows)
      .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .leftJoin(venues, eq(shows.venueId, venues.id));

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }

    const countResult = await countQuery;
    const totalCount = countResult[0]?.count || 0;

    // Get supporting artists for each show (separate query for performance)
    const showIds = showsData.map((show) => show.id);
    const supportingArtistsData =
      showIds.length > 0
        ? await db
            .select({
              showId: showArtists.showId,
              id: showArtists.id,
              artistId: showArtists.artistId,
              orderIndex: showArtists.orderIndex,
              setLength: showArtists.setLength,
              artist: {
                id: artists.id,
                name: artists.name,
                slug: artists.slug,
              },
            })
            .from(showArtists)
            .innerJoin(artists, eq(showArtists.artistId, artists.id))
            .where(inArray(showArtists.showId, showIds))
            .orderBy(showArtists.orderIndex)
        : [];

    // Group supporting artists by show
    const supportingArtistsByShow = supportingArtistsData.reduce(
      (acc, sa) => {
        if (!acc[sa.showId]) {
          acc[sa.showId] = [];
        }
        acc[sa.showId].push({
          id: sa.id,
          artistId: sa.artistId,
          orderIndex: sa.orderIndex,
          setLength: sa.setLength,
          artist: sa.artist,
        });
        return acc;
      },
      {} as Record<string, any[]>,
    );

    // Safe JSON parse function
    const safeJsonParse = (jsonString: string | null) => {
      if (!jsonString) return null;
      try {
        return JSON.parse(jsonString);
      } catch {
        return null;
      }
    };

    // Format response data
    const formattedShows = showsData.map((show) => ({
      ...show,
      headlinerArtist: {
        ...show.headlinerArtist,
        genres: safeJsonParse(show.headlinerArtist.genres),
      },
      supportingArtists: supportingArtistsByShow[show.id] || [],
    }));

    return NextResponse.json({
      shows: formattedShows,
      totalCount,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching shows:", error);
    return NextResponse.json(
      { error: "Failed to fetch shows" },
      { status: 500 },
    );
  }
}
