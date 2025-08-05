import { db } from "@repo/database";
import { artistSongs, artists, songs } from "@repo/database";
import { eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { SpotifyClient } from "@repo/external-apis";
import { createSupabaseAdminClient } from "@repo/database";

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

    // =====================
    // Fetch songs from Spotify
    // =====================

    // Require spotify id
    if (!artistData.spotifyId) {
      return NextResponse.json(
        {
          error: "Artist does not have a spotifyId; cannot sync songs",
        },
        { status: 400 },
      );
    }

    const spotifyClient = new SpotifyClient({});
    try {
      await spotifyClient.authenticate();
    } catch (authError) {
      return NextResponse.json(
        { error: "Spotify authentication failed" },
        { status: 500 },
      );
    }

    // Step 1: fetch all albums (album + single)
    const albums: any[] = [];
    let offset = 0;
    const limit = 50;
    while (true) {
      const resp = await spotifyClient.getArtistAlbums(artistData.spotifyId, {
        include_groups: "album,single",
        market: "US",
        limit,
        offset,
      });

      if (resp.items && resp.items.length > 0) {
        albums.push(...resp.items);
      }

      if (!resp.next) {
        break;
      }
      offset += limit;
      if (offset > 1000) {
        // safety cap
        break;
      }
    }

    // Helper to get raw access token (separate call to avoid private field)
    const getAccessToken = async () => {
      const clientId =
        process.env["SPOTIFY_CLIENT_ID"] ||
        process.env["NEXT_PUBLIC_SPOTIFY_CLIENT_ID"];
      const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];

      if (!clientId || !clientSecret) throw new Error("Missing Spotify creds");

      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const resp = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basic}`,
        },
        body: "grant_type=client_credentials",
      });
      if (!resp.ok) throw new Error("Spotify token fetch failed");
      const json = (await resp.json()) as { access_token: string; expires_in: number };
      return json.access_token;
    };

    const accessToken = await getAccessToken();

    // Fetch tracks for each album
    const trackMap: Map<string, any> = new Map();

    for (const album of albums) {
      let albumOffset = 0;
      while (true) {
        const params = new URLSearchParams({
          market: "US",
          limit: limit.toString(),
          offset: albumOffset.toString(),
        });
        const albumTracksRespRes = await fetch(
          `https://api.spotify.com/v1/albums/${album.id}/tracks?${params}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        if (!albumTracksRespRes.ok) {
          break;
        }
        const albumTracksResp = await albumTracksRespRes.json();

        if (albumTracksResp.items && albumTracksResp.items.length > 0) {
          for (const t of albumTracksResp.items) {
            if (!trackMap.has(t.id)) {
              trackMap.set(t.id, { track: t, album });
            }
          }
        }

        if (!albumTracksResp.next) break;
        albumOffset += limit;
      }
    }

    const tracks = Array.from(trackMap.values());

    // ------------------ realtime progress helper ------------------
    const adminSupabase = createSupabaseAdminClient();
    const progressIdRes = await adminSupabase
      .from("import_progress")
      .insert({ artist_id: artistId, current: 0, total: tracks.length })
      .select("id")
      .single();

    const progressId = progressIdRes.data?.id;

    const updateProgress = async (current: number, status = "in_progress", message = null as string | null) => {
      if (!progressId) return;
      await adminSupabase
        .from("import_progress")
        .update({ current, status, message, updated_at: new Date() })
        .eq("id", progressId);
    };

    if (tracks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No tracks found for artist on Spotify",
        songsCount: 0,
      });
    }

    // Determine which songs already exist
    const existingTrackRows = await db
      .select({ spotifyId: songs.spotifyId })
      .from(songs)
      .where(inArray(songs.spotifyId, tracks.map((t) => t.track.id)));

    const existingIds = new Set(existingTrackRows.map((r) => r.spotifyId));

    const newSongValues = tracks
      .filter((t) => !existingIds.has(t.track.id))
      .map(({ track, album }) => ({
        spotifyId: track.id,
        title: track.name,
        artist: artistData.name,
        album: album.name,
        albumId: album.id,
        albumType: album.album_type,
        albumArtUrl: album.images?.[0]?.url || null,
        releaseDate: album.release_date,
        trackNumber: track.track_number,
        discNumber: track.disc_number || 1,
        durationMs: track.duration_ms,
        popularity: track.popularity ?? 0,
        previewUrl: track.preview_url,
        spotifyUri: track.uri,
        externalUrls: JSON.stringify(track.external_urls || {}),
        isExplicit: track.explicit,
        isPlayable: (track as any).is_playable ?? true,
      }));

    let insertedSongs: any[] = [];
    if (newSongValues.length > 0) {
      insertedSongs = await db.insert(songs).values(newSongValues).returning();
      await updateProgress(tracks.length, "in_progress", `Inserted ${insertedSongs.length} new songs`);
    }

    // Create artist-song relations for all tracks (existing + new)
    const allTrackIds = [
      ...Array.from(existingIds),
      ...insertedSongs.map((s) => s.spotifyId!),
    ];

    // Need to fetch ids for existing songs to relate
    let allSongRows = insertedSongs;
    if (existingIds.size > 0) {
      const existingRowsFull = await db
        .select({ id: songs.id, spotifyId: songs.spotifyId })
        .from(songs)
        .where(inArray(songs.spotifyId, Array.from(existingIds)));
      allSongRows = [...insertedSongs, ...existingRowsFull];
    }

    const artistSongRelations = allSongRows.map((row) => ({
      artistId,
      songId: row.id,
      isPrimaryArtist: true,
    }));

    if (artistSongRelations.length > 0) {
      await db
        .insert(artistSongs)
        .values(artistSongRelations)
        .onConflictDoNothing();
    }

    await updateProgress(tracks.length, "completed", `Catalog sync complete`);

    // Update artist record
    await db
      .update(artists)
      .set({
        songCatalogSyncedAt: new Date(),
        totalSongs: allSongRows.length,
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistId));

    return NextResponse.json({
      success: true,
      message: "Song catalog sync completed",
      artist: artistData,
      songsCount: allSongRows.length,
      newSongsInserted: insertedSongs.length,
    });
  } catch (error) {
    try {
      const adminSupabase = createSupabaseAdminClient();
      await adminSupabase
        .from("import_progress")
        .update({ status: "error", message: String(error) })
        .eq("artist_id", (error as any)?.artistId || "");
    } catch (_) {}
    return NextResponse.json(
      {
        error: "Songs sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
