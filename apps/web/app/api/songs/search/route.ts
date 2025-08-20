import { getUser } from "@repo/auth/server";
import { db, songs } from "@repo/database";
import { and, ilike, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

// GET method for searching songs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("search");
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
    const artistId = searchParams.get("artistId");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        songs: [],
        total: 0,
        query: query || "",
        message: "Query must be at least 2 characters",
      });
    }

    const trimmedQuery = query.trim();

    // Build the search conditions
    const conditions = [
      or(
        ilike(songs.name, `%${trimmedQuery}%`),
        ilike(songs.artist, `%${trimmedQuery}%`),
        ilike(songs.albumName, `%${trimmedQuery}%`),
      ),
    ];

    // If artistId is provided, we'll prioritize songs by that artist in ordering
    let orderByConditions = [
      sql`${songs.popularity} DESC NULLS LAST`,
      sql`${songs.name} ASC`,
    ];

    if (artistId) {
      // Add a case statement to prioritize songs by the specified artist
      orderByConditions = [
        sql`CASE WHEN ${songs.artist} ILIKE (SELECT name FROM artists WHERE id = ${artistId}) THEN 0 ELSE 1 END`,
        sql`${songs.popularity} DESC NULLS LAST`,
        sql`${songs.name} ASC`,
      ];
    }

    // Fetch songs with search conditions
    const songsData = await db
      .select({
        id: songs.id,
        spotify_id: songs.spotifyId,
        title: songs.name, // Map name to title for frontend compatibility
        artist: songs.artist,
        album: songs.albumName, // Map albumName to album for frontend compatibility
        album_art_url: songs.albumArtUrl,
        duration_ms: songs.durationMs,
        popularity: songs.popularity,
        is_explicit: songs.isExplicit,
        preview_url: songs.previewUrl,
        release_date: songs.releaseDate,
      })
      .from(songs)
      .where(and(...conditions))
      .orderBy(...orderByConditions)
      .limit(limit);

    // Get total count for the search
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(songs)
      .where(and(...conditions));

    const total = totalCountResult[0]?.count || 0;

    return NextResponse.json({
      songs: songsData,
      total,
      query: trimmedQuery,
      limit,
      artistId,
    });
  } catch (error) {
    console.error("Song search API error:", error);
    return NextResponse.json(
      {
        songs: [],
        total: 0,
        query: "",
        error: "Failed to search songs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
