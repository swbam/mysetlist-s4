import { db } from '@repo/database';
import { songs } from '@repo/database';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const songData = await request.json();

    // Support both naming conventions
    const {
      spotify_id,
      spotifyId,
      title,
      artist,
      album,
      album_art_url,
      albumArtUrl,
      duration_ms,
      duration,
      is_explicit,
      popularity,
      previewUrl,
    } = songData;

    const finalSpotifyId = spotifyId || spotify_id;
    const finalAlbumArtUrl = albumArtUrl || album_art_url;
    const finalDurationMs = duration || duration_ms;

    if (!title || !artist) {
      return NextResponse.json(
        { error: 'Missing required fields: title, artist' },
        { status: 400 }
      );
    }

    // Check if song already exists
    let existingSong;

    if (finalSpotifyId) {
      existingSong = await db
        .select()
        .from(songs)
        .where(eq(songs.spotifyId, finalSpotifyId))
        .limit(1);
    }

    // If no Spotify ID or not found, check by title and artist
    if (!existingSong || existingSong.length === 0) {
      existingSong = await db
        .select()
        .from(songs)
        .where(eq(songs.title, title))
        .limit(1);

      // Filter for artist match
      existingSong = existingSong.filter((s) => s.artist === artist);
    }

    if (existingSong && existingSong.length > 0) {
      // Update existing song with new data if available
      const updatedSong = await db
        .update(songs)
        .set({
          spotifyId: finalSpotifyId || existingSong[0].spotifyId,
          album: album || existingSong[0].album,
          albumArtUrl: finalAlbumArtUrl || existingSong[0].albumArtUrl,
          durationMs: finalDurationMs || existingSong[0].durationMs,
          popularity: popularity || existingSong[0].popularity,
          previewUrl: previewUrl || existingSong[0].previewUrl,
          updatedAt: new Date(),
        })
        .where(eq(songs.id, existingSong[0].id))
        .returning();

      return NextResponse.json({ song: updatedSong[0] });
    }

    // Create new song
    const newSong = await db
      .insert(songs)
      .values({
        spotifyId: finalSpotifyId || null,
        title,
        artist,
        album: album || null,
        albumArtUrl: finalAlbumArtUrl || null,
        durationMs: finalDurationMs || null,
        isExplicit: is_explicit || false,
        isPlayable: true,
        popularity: popularity || 0,
        previewUrl: previewUrl || null,
        releaseDate: null,
        acousticness: null,
        danceability: null,
        energy: null,
        valence: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ song: newSong[0] });
  } catch (error) {
    console.error('Song upsert error:', error);
    return NextResponse.json({ error: 'Failed to save song' }, { status: 500 });
  }
}
