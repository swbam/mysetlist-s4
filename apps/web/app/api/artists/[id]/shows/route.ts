import { NextResponse } from "next/server";
import { db, artists, shows, venues } from "@repo/database";
import { eq, desc, gte } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // First verify the artist exists
    const artist = await db.query.artists.findFirst({
      where: eq(artists.id, id),
    });

    if (!artist) {
      return NextResponse.json(
        { error: "Artist not found" },
        { status: 404 }
      );
    }

    // SIMPLIFIED: Get shows using direct headliner relationship
    const artistShows = await db
      .select({
        id: shows.id,
        date: shows.date,
        name: shows.name,
        venue: {
          id: venues.id,
          name: venues.name,
          city: venues.city,
          state: venues.state,
          country: venues.country,
        }
      })
      .from(shows)
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(eq(shows.headlinerArtistId, id))
      .orderBy(desc(shows.date))
      .limit(100);

    return NextResponse.json(artistShows);
  } catch (error) {
    console.error("Error fetching artist shows:", error);
    return NextResponse.json(
      { error: "Failed to fetch artist shows" },
      { status: 500 }
    );
  }
}