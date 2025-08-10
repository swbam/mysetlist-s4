import { artistSongs, db, songs } from "@repo/database";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const songSchema = z.object({
  spotifyId: z.string().optional(),
  title: z.string(),
  artist: z.string(),
  artistId: z.string(),
  album: z.string(),
  albumArtUrl: z.string().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  durationMs: z.number(),
  previewUrl: z.string().nullable().optional(),
  popularity: z.number().default(50),
  isExplicit: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // Check for service role key
    const serviceRole = request.headers.get("x-supabase-service-role");
    if (!serviceRole || serviceRole !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = songSchema.parse(body);

    // Check if song exists
    let song;
    if (validatedData.spotifyId) {
      [song] = await db
        .select()
        .from(songs)
        .where(eq(songs.spotifyId, validatedData.spotifyId))
        .limit(1);
    }

    if (!song) {
      // Try to find by title and artist
      [song] = await db
        .select()
        .from(songs)
        .where(eq(songs.title, validatedData.title))
        .limit(1);
    }

    if (song) {
      // Update existing song
      await db
        .update(songs)
        .set({
          title: validatedData.title,
          artist: validatedData.artist,
          album: validatedData.album,
          durationMs: validatedData.durationMs,
          popularity: validatedData.popularity,
          isExplicit: validatedData.isExplicit,
          spotifyId: validatedData.spotifyId ?? null,
          albumArtUrl: validatedData.albumArtUrl ?? null,
          releaseDate: validatedData.releaseDate ?? null,
          previewUrl: validatedData.previewUrl ?? null,
          updatedAt: new Date(),
        })
        .where(eq(songs.id, song.id));
    } else {
      // Create new song
      [song] = await db
        .insert(songs)
        .values({
          title: validatedData.title,
          artist: validatedData.artist,
          album: validatedData.album,
          durationMs: validatedData.durationMs,
          popularity: validatedData.popularity,
          isExplicit: validatedData.isExplicit,
          spotifyId: validatedData.spotifyId ?? null,
          albumArtUrl: validatedData.albumArtUrl ?? null,
          releaseDate: validatedData.releaseDate ?? null,
          previewUrl: validatedData.previewUrl ?? null,
        })
        .returning();
    }

    // Ensure song exists before creating relationship
    if (!song) {
      return NextResponse.json(
        { error: "Failed to create or update song" },
        { status: 500 },
      );
    }

    // Create artist-song relationship if it doesn't exist
    const [existingRelation] = await db
      .select()
      .from(artistSongs)
      .where(eq(artistSongs.songId, song.id))
      .limit(1);

    if (!existingRelation) {
      await db.insert(artistSongs).values({
        artistId: validatedData.artistId,
        songId: song.id,
      });
    }

    return NextResponse.json({ success: true, song });
  } catch (error) {
    console.error("Song sync error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid song data", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to sync song" }, { status: 500 });
  }
}
