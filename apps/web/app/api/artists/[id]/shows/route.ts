import { NextResponse } from "next/server";
import { db, artists, shows, showArtists, venues } from "@repo/database";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    // First verify the artist exists
    const artist = await db.query.artists.findFirst({
      where: eq(artists.id, params.id),
    });

    if (!artist) {
      return NextResponse.json(
        { error: "Artist not found" },
        { status: 404 }
      );
    }

    // Get shows for this artist with venue information
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
      .innerJoin(showArtists, eq(shows.id, showArtists.showId))
      .innerJoin(venues, eq(shows.venueId, venues.id))
      .where(eq(showArtists.artistId, params.id))
      .orderBy(desc(shows.date))
      .limit(100); // Reasonable limit to prevent huge responses

    return NextResponse.json(artistShows);
  } catch (error) {
    console.error("Error fetching artist shows:", error);
    return NextResponse.json(
      { error: "Failed to fetch artist shows" },
      { status: 500 }
    );
  }
}