import { db } from "@repo/database";
import { artists, showArtists, shows, venues } from "@repo/database";
import { and, desc, eq, gte, lt, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artistSlug = searchParams.get("slug");

    if (!artistSlug) {
      return NextResponse.json(
        { error: "Artist slug required" },
        { status: 400 },
      );
    }

    // Get artist
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.slug, artistSlug))
      .limit(1);

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const now = new Date();
    const nowString = now.toISOString().split("T")[0];

    // Debug: Get all shows where artist is involved
    const allArtistShows = await db
      .select({
        show: shows,
        showArtist: showArtists,
        venue: venues,
      })
      .from(shows)
      .leftJoin(showArtists, eq(shows.id, showArtists.showId))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(
        or(
          eq(shows.headlinerArtistId, artist.id),
          eq(showArtists.artistId, artist.id),
        ),
      );

    // Get upcoming shows
    const upcomingShows = await db
      .select({
        show: shows,
        venue: venues,
        orderIndex: showArtists.orderIndex,
        isHeadliner: showArtists.isHeadliner,
      })
      .from(shows)
      .leftJoin(showArtists, eq(shows.id, showArtists.showId))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(
        and(
          or(
            eq(shows.headlinerArtistId, artist.id),
            eq(showArtists.artistId, artist.id),
          ),
          gte(shows.date, nowString!),
        ),
      )
      .orderBy(shows.date);

    // Get past shows
    const pastShows = await db
      .select({
        show: shows,
        venue: venues,
        orderIndex: showArtists.orderIndex,
        isHeadliner: showArtists.isHeadliner,
      })
      .from(shows)
      .leftJoin(showArtists, eq(shows.id, showArtists.showId))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(
        and(
          or(
            eq(shows.headlinerArtistId, artist.id),
            eq(showArtists.artistId, artist.id),
          ),
          lt(shows.date, nowString!),
        ),
      )
      .orderBy(desc(shows.date));

    // Get shows count by different methods
    const headlinerCount = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(shows)
      .where(eq(shows.headlinerArtistId, artist.id));

    const showArtistCount = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(showArtists)
      .where(eq(showArtists.artistId, artist.id));

    return NextResponse.json({
      artist: {
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        ticketmasterId: artist.ticketmasterId,
        lastSyncedAt: artist.lastSyncedAt,
      },
      debug: {
        currentDate: now.toISOString(),
        currentDateString: nowString,
        allShowsCount: allArtistShows.length,
        upcomingShowsCount: upcomingShows.length,
        pastShowsCount: pastShows.length,
        headlinerShowsCount: headlinerCount[0]?.count || 0,
        showArtistRelationsCount: showArtistCount[0]?.count || 0,
      },
      allShows: allArtistShows.map(({ show, venue }) => ({
        id: show.id,
        name: show.name,
        date: show.date,
        headlinerArtistId: show.headlinerArtistId,
        venue: venue?.name || "Unknown",
      })),
      upcomingShows: upcomingShows.slice(0, 5).map(({ show, venue }) => ({
        id: show.id,
        name: show.name,
        date: show.date,
        venue: venue?.name || "Unknown",
      })),
      pastShows: pastShows.slice(0, 5).map(({ show, venue }) => ({
        id: show.id,
        name: show.name,
        date: show.date,
        venue: venue?.name || "Unknown",
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Debug failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
