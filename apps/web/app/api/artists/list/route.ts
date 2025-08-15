import { NextResponse } from "next/server";
import { db, artists } from "@repo/database";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allArtists = await db
      .select({
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
        spotifyId: artists.spotifyId,
        ticketmasterId: artists.ticketmasterId,
        popularity: artists.popularity,
        trendingScore: artists.trendingScore,
        totalSongs: artists.totalSongs,
        totalShows: artists.totalShows,
        createdAt: artists.createdAt,
      })
      .from(artists)
      .orderBy(desc(artists.createdAt))
      .limit(20);

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