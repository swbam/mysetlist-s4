import { db, songs } from "@repo/database"
import { SpotifyClient } from "@repo/external-apis"
import { ilike, or } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"

// Song search API with Spotify integration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    if (!query || query.length < 2) {
      return NextResponse.json({ songs: [] })
    }

    // Search in database first
    const dbSongs = await db
      .select()
      .from(songs)
      .where(
        or(
          ilike(songs.title, `%${query}%`),
          ilike(songs.artist, `%${query}%`),
          ilike(songs.album, `%${query}%`)
        )
      )
      .limit(Math.min(limit, 10))

    // If we have enough results from database, return them
    if (dbSongs.length >= limit) {
      const formattedSongs = dbSongs.map((song) => ({
        id: song.id,
        spotify_id: song.spotifyId,
        title: song.title,
        artist: song.artist,
        album: song.album,
        album_art_url: song.albumArtUrl,
        duration_ms: song.durationMs,
        is_explicit: song.isExplicit,
        preview_url: song.previewUrl,
        popularity: song.popularity,
        source: "database",
      }))

      return NextResponse.json({ songs: formattedSongs })
    }

    // Search Spotify for additional results
    try {
      const spotifyClient = new SpotifyClient({})
      await spotifyClient.authenticate()

      const spotifyResults = await spotifyClient.searchTracks(
        query,
        limit - dbSongs.length
      )

      // Transform Spotify data to our format
      const spotifySongs = spotifyResults.tracks.items.map((track: any) => ({
        id: track.id, // Use Spotify ID as temp ID
        spotify_id: track.id,
        title: track.name,
        artist: track.artists.map((a: any) => a.name).join(", "),
        album: track.album.name,
        album_art_url: track.album.images[0]?.url || null,
        duration_ms: track.duration_ms,
        is_explicit: track.explicit,
        preview_url: track.preview_url,
        external_urls: track.external_urls,
        popularity: track.popularity,
        source: "spotify",
      }))

      // Format database songs to match Spotify format
      const formattedDbSongs = dbSongs.map((song) => ({
        id: song.id,
        spotify_id: song.spotifyId,
        title: song.title,
        artist: song.artist,
        album: song.album,
        album_art_url: song.albumArtUrl,
        duration_ms: song.durationMs,
        is_explicit: song.isExplicit,
        preview_url: song.previewUrl,
        popularity: song.popularity,
        source: "database",
      }))

      // Combine results, database first
      const combinedSongs = [...formattedDbSongs, ...spotifySongs]

      return NextResponse.json({ songs: combinedSongs })
    } catch (_spotifyError) {
      // Fallback to database results only
      const formattedSongs = dbSongs.map((song) => ({
        id: song.id,
        spotify_id: song.spotifyId,
        title: song.title,
        artist: song.artist,
        album: song.album,
        album_art_url: song.albumArtUrl,
        duration_ms: song.durationMs,
        is_explicit: song.isExplicit,
        preview_url: song.previewUrl,
        popularity: song.popularity,
        source: "database",
      }))

      return NextResponse.json({ songs: formattedSongs })
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to search songs" },
      { status: 500 }
    )
  }
}
