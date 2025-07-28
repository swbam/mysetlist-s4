import { getUser } from "@repo/auth/server"
import { db } from "@repo/database"
import { setlistSongs, setlists } from "@repo/database"
import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { setlistId, updates } = await request.json()

    if (!setlistId || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Missing required fields: setlistId, updates" },
        { status: 400 }
      )
    }

    // Check if user can edit this setlist
    const setlist = await db
      .select({
        createdBy: setlists.createdBy,
        isLocked: setlists.isLocked,
      })
      .from(setlists)
      .where(eq(setlists.id, setlistId))
      .limit(1)

    if (setlist.length === 0) {
      return NextResponse.json({ error: "Setlist not found" }, { status: 404 })
    }

    if (setlist[0]!["createdBy"] !== user.id && setlist[0]!["isLocked"]) {
      return NextResponse.json(
        { error: "Cannot modify this setlist" },
        { status: 403 }
      )
    }

    // Update positions in a transaction
    for (const update of updates) {
      await db
        .update(setlistSongs)
        .set({ position: update.position })
        .where(eq(setlistSongs.id, update.id))
    }

    return NextResponse.json({ success: true })
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to reorder setlist" },
      { status: 500 }
    )
  }
}
