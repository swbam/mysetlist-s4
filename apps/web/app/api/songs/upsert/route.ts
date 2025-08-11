import { db, songs } from "@repo/database";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@repo/auth/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

const upsertSongSchema = z.object({
  spotifyId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  artist: z.string().min(1, "Artist is required"),
  album: z.string().optional(),
  albumArtUrl: z.string().url().optional(),
  duration: z.number().optional(),
  popularity: z.number().min(0).max(100).optional(),
  previewUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = upsertSongSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { 
          error: "Invalid song data", 
          details: parsed.error.errors 
        },
        { status: 400 }
      );
    }

    const songData = parsed.data;

    // Check if song already exists by Spotify ID or by title + artist
    let existingSong: typeof songs.$inferSelect | null = null;
    
    if (songData.spotifyId) {
      const existing = await db
        .select()
        .from(songs)
        .where(eq(songs.spotifyId, songData.spotifyId))
        .limit(1);
      
      existingSong = existing[0] || null;
    }
    
    // If no Spotify ID match, try title + artist match
    if (!existingSong) {
      const existing = await db
        .select()
        .from(songs)
        .where(eq(songs.title, songData.title))
        .limit(5); // Get a few results to check artist match
        
      existingSong = existing.find(song => 
        song.artist.toLowerCase() === songData.artist.toLowerCase()
      ) || null;
    }

    if (existingSong) {
      // Song exists, return it
      return NextResponse.json({
        song: {
          id: existingSong.id,
          spotify_id: existingSong.spotifyId,
          title: existingSong.title,
          artist: existingSong.artist,
          album: existingSong.album,
          album_art_url: existingSong.albumArtUrl,
          duration_ms: existingSong.durationMs,
          popularity: existingSong.popularity,
          preview_url: existingSong.previewUrl,
        },
        created: false
      });
    }

    // Create new song
    const newSong = await db
      .insert(songs)
      .values({
        spotifyId: songData.spotifyId,
        title: songData.title,
        artist: songData.artist,
        album: songData.album,
        albumArtUrl: songData.albumArtUrl,
        durationMs: songData.duration,
        popularity: songData.popularity,
        previewUrl: songData.previewUrl,
      })
      .returning();

    const song = newSong[0];

    if (!song) {
      return NextResponse.json(
        { error: "Failed to create song" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      song: {
        id: song.id,
        spotify_id: song.spotifyId,
        title: song.title,
        artist: song.artist,
        album: song.album,
        album_art_url: song.albumArtUrl,
        duration_ms: song.durationMs,
        popularity: song.popularity,
        preview_url: song.previewUrl,
      },
      created: true
    });

  } catch (error) {
    console.error("Error upserting song:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}