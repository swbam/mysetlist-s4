import { db } from "@repo/database";
import { artistSongs, artists, songs } from "@repo/database";
import { SpotifyClient } from "@repo/external-apis";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60; // 1 minute

export async function POST(request: Request) {
  try {
    const { artistId, spotifyId, forceSync } = await request.json();

    if (!artistId) {
      return NextResponse.json(
        { error: "Artist ID is required" },
        { status: 400 },
      );
    }

    // Get artist details
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const artistSpotifyId = spotifyId || artist.spotifyId;
    if (!artistSpotifyId) {
      return NextResponse.json(
        { error: "No Spotify ID available for this artist" },
        { status: 400 },
      );
    }

    // Check if already synced recently (unless force sync)
    if (!forceSync && artist.songCatalogSyncedAt) {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (artist.songCatalogSyncedAt > oneWeekAgo) {
        const existingSongs = await db
          .select({ count: sql<number>`count(*)` })
          .from(artistSongs)
          .where(eq(artistSongs.artistId, artistId));

        return NextResponse.json({
          success: true,
          message: "Songs already synced recently",
          songs: {
            synced: Number(existingSongs[0]?.count || 0),
            errors: 0,
          },
        });
      }
    }

    console.log(
      `[Song Sync] Starting sync for ${artist.name} (${artistSpotifyId})`,
    );

    const results = {
      synced: 0,
      errors: 0,
      tracks: [] as any[],
    };

    try {
      // Initialize Spotify client
      const spotify = new SpotifyClient({});
      await spotify.authenticate();

      // Fetch top tracks
      const topTracks = await spotify.getArtistTopTracks(artistSpotifyId, "US");
      console.log(`[Song Sync] Found ${topTracks.length} top tracks`);

      // Fetch albums and their tracks
      const albums = await spotify.getArtistAlbums(artistSpotifyId, 50);
      console.log(`[Song Sync] Found ${albums.length} albums`);

      const allTracks = [...topTracks];

      // Fetch tracks from each album
      for (const album of albums) {
        try {
          const albumTracks = await spotify.getAlbumTracks(album.id);
          // Filter to only include tracks by this artist
          const artistTracks = albumTracks.filter((track) =>
            track.artists.some((a) => a.id === artistSpotifyId),
          );
          allTracks.push(...artistTracks);
        } catch (error) {
          console.error(
            `[Song Sync] Error fetching tracks for album ${album.name}:`,
            error,
          );
          results.errors++;
        }
      }

      // Deduplicate tracks by Spotify ID
      const uniqueTracks = Array.from(
        new Map(allTracks.map((track) => [track.id, track])).values(),
      );

      console.log(
        `[Song Sync] Processing ${uniqueTracks.length} unique tracks`,
      );

      // Batch insert songs
      for (const track of uniqueTracks) {
        try {
          // First, insert or update the song
          const [existingSong] = await db
            .select()
            .from(songs)
            .where(eq(songs.spotifyId, track.id))
            .limit(1);

          let songId: string;

          if (existingSong) {
            // Update existing song
            await db
              .update(songs)
              .set({
                title: track.name,
                artist: artist.name,
                album: track.album?.name || null,
                albumArtUrl: track.album?.images?.[0]?.url || null,
                releaseDate: track.album?.release_date || null,
                durationMs: track.duration_ms,
                popularity: track.popularity,
                previewUrl: track.preview_url,
                isExplicit: track.explicit || false,
                updatedAt: new Date(),
              })
              .where(eq(songs.id, existingSong.id));

            songId = existingSong.id;
          } else {
            // Insert new song
            const [newSong] = await db
              .insert(songs)
              .values({
                title: track.name,
                artist: artist.name,
                album: track.album?.name || null,
                albumArtUrl: track.album?.images?.[0]?.url || null,
                releaseDate: track.album?.release_date || null,
                durationMs: track.duration_ms,
                popularity: track.popularity,
                previewUrl: track.preview_url,
                spotifyId: track.id,
                isExplicit: track.explicit || false,
              })
              .returning();

            songId = newSong.id;
          }

          // Create artist-song relationship if it doesn't exist
          const [existingRelation] = await db
            .select()
            .from(artistSongs)
            .where(
              and(
                eq(artistSongs.artistId, artistId),
                eq(artistSongs.songId, songId),
              ),
            )
            .limit(1);

          if (!existingRelation) {
            await db.insert(artistSongs).values({
              artistId: artistId,
              songId: songId,
            });
          }

          results.synced++;
          results.tracks.push({
            id: track.id,
            name: track.name,
            album: track.album?.name,
          });
        } catch (error) {
          console.error(
            `[Song Sync] Error processing track ${track.name}:`,
            error,
          );
          results.errors++;
        }
      }

      // Update artist with sync timestamp and song count
      await db
        .update(artists)
        .set({
          songCatalogSyncedAt: new Date(),
          totalSongs: results.synced,
          updatedAt: new Date(),
        })
        .where(eq(artists.id, artistId));

      console.log(
        `[Song Sync] Completed sync for ${artist.name}: ${results.synced} songs synced, ${results.errors} errors`,
      );

      return NextResponse.json({
        success: true,
        artist: {
          id: artistId,
          name: artist.name,
          spotifyId: artistSpotifyId,
        },
        songs: {
          synced: results.synced,
          errors: results.errors,
          total: uniqueTracks.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`[Song Sync] Spotify API error:`, error);
      return NextResponse.json(
        {
          error: "Failed to sync with Spotify",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[Song Sync] Request error:", error);
    return NextResponse.json(
      {
        error: "Failed to process sync request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
