import { NextResponse } from "next/server";
import { db } from "@repo/database";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allArtists = await db.query.artists.findMany({
      limit: 20,
      orderBy: (artists, { desc }) => [desc(artists.createdAt)],
      columns: {
        id: true,
        name: true,
        slug: true,
        spotifyId: true,
        ticketmasterId: true,
        popularity: true,
        trendingScore: true,
        totalSongs: true,
        totalShows: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: allArtists.length,
      artists: allArtists,
    });
  } catch (error) {
    console.error("Error fetching artists:", error);
    return NextResponse.json(
      { error: "Failed to fetch artists" },
      { status: 500 }
    );
  }
}