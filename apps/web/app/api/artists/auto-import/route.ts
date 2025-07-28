import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "~/lib/supabase/server"

interface AutoImportRequest {
  artistId?: string
  artistName?: string
  spotifyId?: string
}

/**
 * Automated artist data import handler
 * Triggers comprehensive data sync when user interacts with an artist
 */
export async function POST(request: NextRequest) {
  try {
    const body: AutoImportRequest = await request.json()
    const { artistId, artistName, spotifyId } = body

    if (!artistId && !artistName && !spotifyId) {
      return NextResponse.json(
        { error: "Either artistId, artistName, or spotifyId is required" },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // Find or create artist
    let artist

    if (artistId) {
      // Look up by ID
      const { data: existingArtist } = await supabase
        .from("artists")
        .select("*")
        .eq("id", artistId)
        .single()

      artist = existingArtist
    } else if (spotifyId) {
      // Look up by Spotify ID
      const { data: existingArtist } = await supabase
        .from("artists")
        .select("*")
        .eq("spotify_id", spotifyId)
        .single()

      artist = existingArtist
    } else if (artistName) {
      // Look up by name
      const { data: existingArtist } = await supabase
        .from("artists")
        .select("*")
        .eq("name", artistName)
        .single()

      artist = existingArtist
    }

    // If artist doesn't exist, trigger sync to create it
    if (!artist) {
      // For now, return error. In production, this would trigger artist creation
      return NextResponse.json(
        { error: "Artist not found in database" },
        { status: 404 }
      )
    }

    // Check if we need to sync data (only if not synced in last 24 hours)
    const needsSync =
      !artist.last_synced_at ||
      new Date(artist.last_synced_at) <
        new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours

    if (needsSync) {
      // Update last synced timestamp first to prevent duplicate syncs
      await supabase
        .from("artists")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", artist.id)

      // Trigger background sync for shows and additional data
      setImmediate(async () => {
        try {
          // If we have a Ticketmaster ID, sync shows
          if (artist.ticketmaster_id) {
            await fetch(
              `${process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3001"}/api/artists/sync-shows`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  artistId: artist.id,
                }),
              }
            )
          }
        } catch (_error) {}
      })
    }

    // Get current data stats
    const { count: showCount } = await supabase
      .from("shows")
      .select("*", { count: "exact", head: true })
      .eq("headliner_artist_id", artist.id)

    const { count: songCount } = await supabase
      .from("artist_songs")
      .select("*", { count: "exact", head: true })
      .eq("artist_id", artist.id)

    // Helper function to safely parse genres
    const parseGenres = (genresField: string | string[] | null): string[] => {
      if (!genresField) return []

      if (Array.isArray(genresField)) {
        return genresField
      }

      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(genresField)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        // If JSON parsing fails, treat as comma-separated string
        return genresField
          .split(",")
          .map((genre) => genre.trim())
          .filter((genre) => genre.length > 0)
      }
    }

    return NextResponse.json({
      success: true,
      artist: {
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        spotifyId: artist.spotify_id,
        ticketmasterId: artist.ticketmaster_id,
        imageUrl: artist.image_url,
        genres: parseGenres(artist.genres),
        popularity: artist.popularity,
        followers: artist.followers,
        verified: artist.verified,
      },
      stats: {
        showCount: showCount || 0,
        songCount: songCount || 0,
        totalAlbums: artist.total_albums || 0,
        totalSongs: artist.total_songs || 0,
        lastSyncedAt: artist.last_synced_at,
        lastFullSyncAt: artist.last_full_sync_at,
        songCatalogSyncedAt: artist.song_catalog_synced_at,
        syncTriggered: needsSync,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to auto-import artist data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
