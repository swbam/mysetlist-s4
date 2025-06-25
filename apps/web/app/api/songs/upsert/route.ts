import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { songs } from '@repo/database';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const songData = await request.json();
    
    const {
      spotify_id,
      title,
      artist,
      album,
      album_art_url,
      duration_ms,
      is_explicit,
    } = songData;

    if (!spotify_id || !title || !artist) {
      return NextResponse.json(
        { error: 'Missing required fields: spotify_id, title, artist' },
        { status: 400 }
      );
    }

    // Check if song already exists
    const existingSong = await db
      .select()
      .from(songs)
      .where(eq(songs.spotifyId, spotify_id))
      .limit(1);

    if (existingSong.length > 0) {
      // Return existing song
      return NextResponse.json({ song: existingSong[0] });
    }

    // Create new song
    const newSong = await db
      .insert(songs)
      .values({
        spotifyId: spotify_id,
        title,
        artist,
        album,
        albumArtUrl: album_art_url,
        durationMs: duration_ms,
        isExplicit: is_explicit || false,
        isPlayable: true,
        popularity: 0, // Default value
      })
      .returning();

    return NextResponse.json({ song: newSong[0] });
  } catch (error) {
    console.error('Song upsert error:', error);
    return NextResponse.json(
      { error: 'Failed to save song' },
      { status: 500 }
    );
  }
}