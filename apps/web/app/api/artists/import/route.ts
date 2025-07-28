import { SpotifyClient, TicketmasterClient } from "@repo/external-apis"
import { type NextRequest, NextResponse } from "next/server"
import { EnhancedSyncService } from "~/app/api/sync/unified-pipeline/enhanced-sync-service"
import { createServiceClient } from "~/lib/supabase/server"
import { generateSlug } from "~/lib/utils/slug"

interface ImportArtistRequest {
  ticketmasterId?: string
  artistName: string
  imageUrl?: string
  genres?: string[]
  externalUrls?: any
}

export async function POST(request: NextRequest) {
  try {
    const body: ImportArtistRequest = await request.json()
    const { ticketmasterId, artistName, imageUrl, genres, externalUrls } = body

    if (!artistName) {
      return NextResponse.json(
        { error: "Artist name is required" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Check if artist already exists
    const { data: existingArtist } = await supabase
      .from("artists")
      .select("id, slug, verified")
      .or(`name.ilike.${artistName},ticketmaster_id.eq.${ticketmasterId}`)
      .single()

    if (existingArtist) {
      // Artist exists, trigger sync and return
      if (!existingArtist.verified) {
        // Update verification status and trigger full sync
        const syncService = new EnhancedSyncService()
        await syncService.syncArtistComplete(existingArtist.id)

        await supabase
          .from("artists")
          .update({
            verified: true,
            last_sync_at: new Date().toISOString(),
            sync_status: "completed",
          })
          .eq("id", existingArtist.id)
      }

      return NextResponse.json({
        success: true,
        artist: {
          id: existingArtist.id,
          slug: existingArtist.slug,
          verified: true,
        },
        action: "updated",
      })
    }

    // Create new artist
    const slug = generateSlug(artistName)
    let spotifyId: string | null = null
    let spotifyData: any = null

    // Try to find Spotify data
    try {
      const spotify = new SpotifyClient({})
      await spotify.authenticate()
      const spotifyResults = await spotify.searchArtists(artistName, 1)
      // Handle different possible return types from SpotifyClient
      const artists = Array.isArray(spotifyResults)
        ? spotifyResults
        : (spotifyResults as any)?.artists?.items || []

      if (artists.length > 0) {
        const spotifyArtist = artists[0]
        spotifyId = spotifyArtist.id
        spotifyData = {
          followers: spotifyArtist.followers?.total || 0,
          popularity: spotifyArtist.popularity || 0,
          genres: spotifyArtist.genres || [],
          images: spotifyArtist.images || [],
        }
      }
    } catch (error) {
      console.warn("Failed to fetch Spotify data:", error)
    }

    // Insert new artist
    const { data: newArtist, error: insertError } = await supabase
      .from("artists")
      .insert({
        name: artistName,
        slug,
        image_url: imageUrl || spotifyData?.images?.[0]?.url,
        genres: JSON.stringify(genres || spotifyData?.genres || []),
        ticketmaster_id: ticketmasterId,
        spotify_id: spotifyId,
        verified: false,
        popularity: spotifyData?.popularity || 0,
        follower_count: spotifyData?.followers || 0,
        sync_status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id, slug")
      .single()

    if (insertError) {
      console.error("Failed to insert artist:", insertError)
      return NextResponse.json(
        { error: "Failed to create artist" },
        { status: 500 }
      )
    }

    // Trigger immediate full sync in background
    // Don't await this to return quickly to user
    const syncService = new EnhancedSyncService()
    syncService
      .syncArtistComplete(newArtist.id)
      .then(async () => {
        // Update verification status after sync
        await supabase
          .from("artists")
          .update({
            verified: true,
            last_sync_at: new Date().toISOString(),
            sync_status: "completed",
          })
          .eq("id", newArtist.id)
      })
      .catch((error) => {
        console.error("Background sync failed:", error)
        // Update sync status to failed
        supabase
          .from("artists")
          .update({ sync_status: "failed" })
          .eq("id", newArtist.id)
      })

    return NextResponse.json({
      success: true,
      artist: {
        id: newArtist.id,
        slug: newArtist.slug,
        verified: false, // Will be updated after sync
      },
      action: "created",
    })
  } catch (error) {
    console.error("Artist import error:", error)
    return NextResponse.json(
      {
        error: "Import failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check import status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const artistId = searchParams.get("artistId")

    if (!artistId) {
      return NextResponse.json(
        { error: "Artist ID is required" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const { data: artist } = await supabase
      .from("artists")
      .select("id, name, slug, verified, sync_status, last_sync_at")
      .eq("id", artistId)
      .single()

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 })
    }

    return NextResponse.json({
      artist,
      ready: artist.verified && artist.sync_status === "completed",
    })
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json({ error: "Status check failed" }, { status: 500 })
  }
}
