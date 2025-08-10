import { artistSongs, artists, db } from "@repo/database";
import { spotify } from "@repo/external-apis";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { artistId } = await request.json();

    if (!artistId) {
      return NextResponse.json(
        { error: "Artist ID required" },
        { status: 400 },
      );
    }

    // Get artist from database
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artist || !artist.spotifyId) {
      return NextResponse.json(
        { error: "Artist not found or missing Spotify ID" },
        { status: 404 },
      );
    }

    // Fetch top tracks from Spotify
    const topTracks = await spotify.getArtistTopTracks(artist.spotifyId);

    if (!topTracks || topTracks.length === 0) {
      return NextResponse.json(
        { error: "No tracks found for artist" },
        { status: 404 },
      );
    }

    // Insert songs into artist_songs table
    const insertedSongs = [];
    for (const track of topTracks.slice(0, 50)) {
      // Limit to 50 songs
      try {
        // Check if song already exists
        const existing = await db
          .select()
          .from(artistSongs)
          .where(eq(artistSongs.spotifyId, track.id))
          .limit(1);

        if (existing.length === 0) {
          const [newSong] = await db
            .insert(artistSongs)
            .values({
              artistId: artistId,
              title: track.name,
              spotifyId: track.id,
              albumName: track.album?.name,
              albumArtUrl: track.album?.images?.[0]?.url,
              durationMs: track.duration_ms,
              popularity: track.popularity,
              previewUrl: track.preview_url,
              isExplicit: track.explicit,
              trackNumber: track.track_number,
              spotifyUri: track.uri,
              externalUrls: track.external_urls,
            })
            .returning();

          insertedSongs.push(newSong);
        }
      } catch (error) {
        console.error(`Failed to insert song ${track.name}:`, error);
      }
    }

    // Update artist's song catalog synced timestamp
    await db
      .update(artists)
      .set({
        songCatalogSyncedAt: new Date(),
        totalSongs: insertedSongs.length,
      })
      .where(eq(artists.id, artistId));

    return NextResponse.json({
      success: true,
      songsAdded: insertedSongs.length,
      artist: artist.name,
    });
  } catch (error) {
    console.error("Sync songs error:", error);
    return NextResponse.json(
      { error: "Failed to sync songs" },
      { status: 500 },
    );
  }
}
