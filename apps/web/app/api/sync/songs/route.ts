import { db } from "@repo/database";
import { artistSongs, artists, songs } from "@repo/database";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// POST /api/sync/songs
// Body: { artistId: string }
// Syncs song catalog for a given artist
export async function POST(request: NextRequest) {
  try {
    const { artistId } = await request.json();

    if (!artistId) {
      return NextResponse.json(
        { error: "Artist ID required" },
        { status: 400 },
      );
    }

    // Verify artist exists
    const artist = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artist.length) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const artistData = artist[0];

    // Check if artist already has songs
    const existingSongs = await db
      .select({
        song: songs,
      })
      .from(artistSongs)
      .innerJoin(songs, eq(artistSongs.songId, songs.id))
      .where(eq(artistSongs.artistId, artistId));

    if (existingSongs.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Song catalog already synced",
        artist: artistData,
        songsCount: existingSongs.length,
        songs: existingSongs.map((s) => s.song),
      });
    }

    // Fetch songs from Spotify (top tracks + first 5 albums)
    if (!artistData.spotifyId) {
      return NextResponse.json({
        success: true,
        message: "Artist does not have a Spotify ID; nothing to sync",
        artist: artistData,
        songsCount: 0,
        songs: [],
      });
    }

    // Initialize Spotify client
    const { SpotifyClient } = await import("@repo/external-apis");
    const spotify = new SpotifyClient({});
    await spotify.authenticate();

    const topTracksResp = await spotify.getArtistTopTracks(
      artistData.spotifyId,
      "US",
    );
    const topTracks = (topTracksResp as any).tracks || [];

    const albumsResp = await spotify.getArtistAlbums(artistData.spotifyId, {
      limit: 20,
    });
    const albums = (albumsResp as any).items || [];

    const albumTracks: any[] = [];
    for (const album of albums.slice(0, 5)) {
      try {
        const tracksResp = await spotify.makeRequest<any>(
          `/albums/${album.id}/tracks`,
        );
        albumTracks.push(...tracksResp.items);
      } catch (_e) {}
    }

    const allTracks = [...topTracks, ...albumTracks];
    const uniqueTracks = Array.from(
      new Map(allTracks.map((t: any) => [t.id, t])).values(),
    );

    const insertedSongs = [] as any[];
    for (const track of uniqueTracks) {
      try {
        const [songRow] = await db
          .insert(songs)
          .values({
            title: track.name,
            artist: artistData.name,
            album: track.album?.name || null,
            albumArtUrl: track.album?.images?.[0]?.url || null,
            releaseDate: track.album?.release_date || null,
            durationMs: track.duration_ms,
            popularity: track.popularity,
            previewUrl: track.preview_url,
            spotifyId: track.id,
            isExplicit: track.explicit ?? false,
            isPlayable: track.is_playable ?? true,
          })
          .onConflictDoUpdate({
            target: songs.spotifyId,
            set: { popularity: track.popularity, title: track.name },
          })
          .returning();
        insertedSongs.push(songRow);

        await db
          .insert(artistSongs)
          .values({ artistId, songId: songRow.id, isPrimaryArtist: true })
          .onConflictDoNothing();
      } catch (_e) {}
    }

    if (insertedSongs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No new songs added (all up to date)",
        artist: artistData,
        songsCount: 0,
        songs: [],
      });
    }

    // Update artist's song catalog sync timestamp and counts
    await db
      .update(artists)
      .set({
        songCatalogSyncedAt: new Date(),
        totalSongs: insertedSongs.length,
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistId));

    return NextResponse.json({
      success: true,
      message: "Song catalog sync completed",
      artist: artistData,
      songsCount: insertedSongs.length,
      songs: insertedSongs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Songs sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
