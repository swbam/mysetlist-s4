import { db, songs, artistSongs } from "@repo/database";
import { eq, desc } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";

    // Get artist's songs from the junction table
    const artistSongsData = await db
      .select({
        id: songs.id,
        spotifyId: songs.spotifyId,
        title: songs.title,
        artist: songs.artist,
        album: songs.album,
        albumArtUrl: songs.albumArtUrl,
        durationMs: songs.durationMs,
        popularity: songs.popularity,
        previewUrl: songs.previewUrl,
        isExplicit: songs.isExplicit,
        releaseDate: songs.releaseDate,
        albumType: songs.albumType,
        isPrimaryArtist: artistSongs.isPrimaryArtist,
      })
      .from(artistSongs)
      .innerJoin(songs, eq(artistSongs.songId, songs.id))
      .where(eq(artistSongs.artistId, id))
      .orderBy(desc(songs.popularity), songs.title)
      .limit(Math.min(limit, 200));

    // Filter by search query if provided
    let filteredSongs = artistSongsData;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSongs = artistSongsData.filter(
        (song) =>
          song.title.toLowerCase().includes(searchLower) ||
          song.album?.toLowerCase().includes(searchLower),
      );
    }

    // Format response
    const formattedSongs = filteredSongs.map((song) => ({
      id: song.id,
      spotify_id: song.spotifyId,
      title: song.title,
      artist: song.artist,
      album: song.album,
      album_art_url: song.albumArtUrl,
      duration_ms: song.durationMs,
      popularity: song.popularity,
      preview_url: song.previewUrl,
      is_explicit: song.isExplicit,
      release_date: song.releaseDate,
      album_type: song.albumType,
      is_primary_artist: song.isPrimaryArtist,
    }));

    return NextResponse.json({
      songs: formattedSongs,
      total: formattedSongs.length,
      limit,
      search: search || undefined,
    });
  } catch (error) {
    console.error("Error fetching artist songs:", error);
    return NextResponse.json(
      { error: "Failed to fetch artist songs" },
      { status: 500 },
    );
  }
}