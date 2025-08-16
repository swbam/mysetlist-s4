import { artistSongs, artists, db, songs } from "@repo/database";
import { and, eq, ilike, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: artistId } = await params;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const offset = Number(searchParams.get("offset")) || 0;

    // Verify artist exists
    const artist = await db
      .select({ id: artists.id, name: artists.name })
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (artist.length === 0) {
      return NextResponse.json(
        { error: "Artist not found" },
        { status: 404 }
      );
    }

    // Build query conditions
    const conditions = [eq(artistSongs.artistId, artistId)];

    if (search && search.length >= 2) {
      conditions.push(ilike(songs.name, `%${search}%`));
    }

    // Fetch songs with pagination
    const artistSongsList = await db
      .select({
        id: songs.id,
        spotify_id: songs.spotifyId,
        title: songs.name,
        artist: songs.artist,
        album: songs.albumName,
        album_art_url: songs.albumArtUrl,
        duration_ms: songs.durationMs,
        popularity: songs.popularity,
        preview_url: songs.previewUrl,
        is_explicit: songs.isExplicit,
        release_date: songs.releaseDate,
        album_type: songs.albumType,
      })
      .from(artistSongs)
      .innerJoin(songs, eq(artistSongs.songId, songs.id))
      .where(and(...conditions))
      .orderBy(sql`${songs.popularity} DESC NULLS LAST, ${songs.name} ASC`)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(artistSongs)
      .innerJoin(songs, eq(artistSongs.songId, songs.id))
      .where(and(...conditions));

    // Transform the response to match frontend expectations
    const transformedSongs = artistSongsList.map(song => ({
      id: song.id,
      spotifyId: song.spotifyId,
      title: song.title,
      artist: song.artist,
      album: song.album,
      albumArtUrl: song.albumArtUrl,
      durationMs: song.durationMs,
      popularity: song.popularity,
      previewUrl: song.previewUrl,
      isExplicit: song.isExplicit,
      releaseDate: song.releaseDate,
      albumType: song.albumType,
    }));

    return NextResponse.json({
      songs: transformedSongs,
      total: totalCount[0]?.count || 0,
      limit,
      offset,
      artist: artist[0],
    });
  } catch (error) {
    console.error("Error fetching artist songs:", error);
    return NextResponse.json(
      { error: "Failed to fetch artist songs" },
      { status: 500 }
    );
  }
}