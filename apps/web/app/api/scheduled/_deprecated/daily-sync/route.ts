import { db } from "@repo/database"
import { artists, shows } from "@repo/database"
import { and, eq, isNull, lte } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"

const CRON_SECRET = process.env["CRON_SECRET"]

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const results = {
      artistsSynced: 0,
      showsSynced: 0,
      errors: [] as string[],
    }

    // 1. Sync popular artists that haven't been synced in 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const staleArtists = await db
      .select()
      .from(artists)
      .where(
        and(
          isNull(artists.lastSyncedAt)
          // Or last synced more than 24 hours ago
        )
      )
      .limit(50) // Limit to prevent timeout

    // Also get artists that haven't been synced in 24 hours
    const outdatedArtists = await db
      .select()
      .from(artists)
      .where(lte(artists.lastSyncedAt, oneDayAgo))
      .limit(50)

    const artistsToSync = [...staleArtists, ...outdatedArtists]

    // Sync each artist
    for (const artist of artistsToSync) {
      try {
        const syncResponse = await fetch(
          `${process.env["NEXT_PUBLIC_APP_URL"]}/api/sync/artist`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ artistId: artist.id }),
          }
        )

        if (syncResponse.ok) {
          results.artistsSynced++
        } else {
          const errorData = await syncResponse.json()
          results.errors.push(
            `Failed to sync artist ${artist.name}: ${errorData.error}`
          )
        }
      } catch (error) {
        results.errors.push(
          `Error syncing artist ${artist.name}: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      }
    }

    // 2. Update upcoming show statuses
    const today = new Date().toISOString().split("T")[0]!

    // Mark past shows as 'completed'
    await db
      .update(shows)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(and(lte(shows.date, today), eq(shows.status, "upcoming")))

    // 3. Clean up old data (optional)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    return NextResponse.json({
      success: true,
      message: "Daily sync completed",
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Daily sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
