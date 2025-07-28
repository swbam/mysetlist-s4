import { db } from "@repo/database"
import { artists, shows, songs, venues } from "@repo/database"
import { count } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { UnifiedSyncService } from "./sync-service-v2"

// API Handler
export async function POST(request: NextRequest) {
  try {
    const { artistId, artistIds, mode = "single" } = await request.json()

    if (mode === "single" && !artistId) {
      return NextResponse.json(
        { error: "artistId is required for single sync mode" },
        { status: 400 }
      )
    }

    if (mode === "bulk" && (!artistIds || !Array.isArray(artistIds))) {
      return NextResponse.json(
        { error: "artistIds array is required for bulk sync mode" },
        { status: 400 }
      )
    }

    const syncService = new UnifiedSyncService()
    let results

    if (mode === "single") {
      results = await syncService.syncArtistCatalog(artistId)
    } else {
      results = await syncService.syncBulkArtists(artistIds)
    }

    return NextResponse.json({
      success: true,
      mode,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Sync pipeline failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// GET endpoint for sync status and configuration
export async function GET() {
  try {
    const config = {
      spotify: {
        enabled:
          !!process.env["SPOTIFY_CLIENT_ID"] &&
          !!process.env["SPOTIFY_CLIENT_SECRET"],
        rateLimits: { requests: 90, window: "1 minute" },
      },
      ticketmaster: {
        enabled: !!process.env["TICKETMASTER_API_KEY"],
        rateLimits: { requests: 200, window: "1 hour" },
      },
      setlistfm: {
        enabled: !!process.env["SETLISTFM_API_KEY"],
        rateLimits: { requests: 1, window: "1 second" },
      },
      features: {
        artistSync: true,
        songSync: true,
        showSync: true,
        venueSync: true,
        setlistSync: !!process.env["SETLISTFM_API_KEY"],
      },
    }

    // Get sync statistics
    const stats = {
      artists: await db.select({ count: count() }).from(artists),
      songs: await db.select({ count: count() }).from(songs),
      shows: await db.select({ count: count() }).from(shows),
      venues: await db.select({ count: count() }).from(venues),
    }

    return NextResponse.json({
      success: true,
      config,
      stats: {
        totalArtists: stats.artists[0]?.count || 0,
        totalSongs: stats.songs[0]?.count || 0,
        totalShows: stats.shows[0]?.count || 0,
        totalVenues: stats.venues[0]?.count || 0,
      },
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    )
  }
}
