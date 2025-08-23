import { db } from "@repo/database";
import { songs } from "@repo/database";
import { and, ilike, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "~/lib/supabase/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

// GET method for fetching songs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const artistId = searchParams.get("artistId");
    const artistName = searchParams.get("artistName");

    const supabase = createServiceClient();

    let query = supabase.from("songs").select(`
        id,
        title,
        artist,
        album,
        album_art_url,
        duration_ms,
        spotify_id,
        popularity,
        release_date,
        created_at
      `);

    // Apply filters using Supabase query methods
    if (search) {
      // Search in title and artist fields using Supabase .or() method
      query = query.or(`title.ilike.%${search}%,artist.ilike.%${search}%`);
    }

    if (artistName) {
      query = query.ilike("artist", `%${artistName}%`);
    }

    // Add pagination and ordering
    const offset = (page - 1) * limit;
    query = query
      .order("popularity", { ascending: false })
      .order("title", { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: songsData, error } = await query;

    if (error) {
      console.error("Error fetching songs:", error);
      throw error;
    }

    // Get total count for pagination
    let countQuery = supabase.from("songs").select("*", { count: "exact" });
    if (search) {
      countQuery = countQuery.or(
        `title.ilike.%${search}%,artist.ilike.%${search}%`,
      );
    }
    if (artistName) {
      countQuery = countQuery.ilike("artist", `%${artistName}%`);
    }

    const { count } = await countQuery;

    return NextResponse.json(
      {
        songs: songsData || [],
        total: count || 0,
        page,
        limit,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("Songs API error:", error);
    return NextResponse.json(
      {
        songs: [],
        total: 0,
        page: 1,
        limit: 20,
        generatedAt: new Date().toISOString(),
        fallback: true,
        error: "Unable to load songs at this time",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }
}

// POST method for creating new songs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      artist,
      album,
      spotifyId,
      albumArtUrl,
      durationMs,
      popularity = 0,
      releaseDate,
      albumType = "album",
    } = body;

    if (!title || !artist) {
      return NextResponse.json(
        { error: "Missing required fields: title, artist" },
        { status: 400 },
      );
    }

    // Create the song using Drizzle
    const newSong = await db
      .insert(songs)
      .values({
        name: title,
        artist,
        albumName: album,
        spotifyId,
        albumArtUrl,
        durationMs,
        popularity,
        releaseDate,
        albumType,
      })
      .returning();

    return NextResponse.json(newSong[0]);
  } catch (error) {
    console.error("Error creating song:", error);
    return NextResponse.json(
      { error: "Failed to create song" },
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
