import { NextResponse } from "next/server";
import { db, artists, shows, showArtists, setlists, artistSongs, eq, sql } from "@repo/database";
import { count } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // First verify the artist exists
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, id))
      .limit(1);

    if (!artist) {
      return NextResponse.json(
        { error: "Artist not found" },
        { status: 404 }
      );
    }

    // Get various stats for the artist
    const [
      showsCount,
      songsCount,
      setlistsCount,
    ] = await Promise.all([
      // Count shows
      db
        .select({ count: count() })
        .from(showArtists)
        .where(eq(showArtists.artistId, id))
        .then(result => result[0]?.count || 0),
      
      // Count unique songs
      db
        .select({ count: count() })
        .from(artistSongs)
        .where(eq(artistSongs.artistId, id))
        .then(result => result[0]?.count || 0),
      
      // Count setlists
      db
        .select({ count: count() })
        .from(setlists)
        .innerJoin(shows, eq(setlists.showId, shows.id))
        .innerJoin(showArtists, eq(shows.id, showArtists.showId))
        .where(eq(showArtists.artistId, id))
        .then(result => result[0]?.count || 0),
    ]);

    // Get most recent show date
    const recentShow = await db
      .select({ date: shows.date })
      .from(shows)
      .innerJoin(showArtists, eq(shows.id, showArtists.showId))
      .where(eq(showArtists.artistId, id))
      .orderBy(sql`${shows.date} desc`)
      .limit(1);

    const stats = {
      showsCount,
      songsCount,
      setlistsCount,
      lastShowDate: recentShow[0]?.date || null,
      followerCount: artist.followerCount || 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching artist stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch artist stats" },
      { status: 500 }
    );
  }
}