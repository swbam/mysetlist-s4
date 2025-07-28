import { db } from "@repo/database"
import { setlistSongs } from "@repo/database"
import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import {
  canPerformAnonymousAction,
  getAnonymousLimitsStatus,
  getAnonymousSessionId,
  incrementAnonymousAction,
} from "~/lib/anonymous-limits"

export async function POST(request: NextRequest) {
  try {
    const {
      setlistSongId,
      voteType,
      sessionId: _sessionId,
    } = await request.json()

    if (!setlistSongId) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      )
    }

    // Get the actual session ID from our tracking system
    const trackedSessionId = await getAnonymousSessionId()

    // Check if anonymous user can vote
    const { allowed, remaining, resetTime } =
      await canPerformAnonymousAction("votes")

    if (!allowed) {
      const status = await getAnonymousLimitsStatus()
      return NextResponse.json(
        {
          error: "Anonymous vote limit reached",
          limits: status.limits,
          usage: status.usage,
          resetTime: status.resetTime,
        },
        { status: 429 }
      )
    }

    // Get current vote counts
    const song = await db
      .select({
        upvotes: setlistSongs.upvotes,
        downvotes: setlistSongs.downvotes,
        netVotes: setlistSongs.netVotes,
      })
      .from(setlistSongs)
      .where(eq(setlistSongs.id, setlistSongId))
      .limit(1)

    if (song.length === 0) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }

    // Increment the anonymous action count
    await incrementAnonymousAction("votes")

    // Return the vote data without modifying the database
    // The client will handle the optimistic update
    return NextResponse.json({
      success: true,
      userVote: voteType,
      ...song[0],
      isAnonymous: true,
      sessionId: trackedSessionId,
      limits: {
        remaining: remaining - 1,
        resetTime,
      },
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const setlistSongId = searchParams.get("setlistSongId")

    if (!setlistSongId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    // Get vote counts
    const song = await db
      .select({
        upvotes: setlistSongs.upvotes,
        downvotes: setlistSongs.downvotes,
        netVotes: setlistSongs.netVotes,
      })
      .from(setlistSongs)
      .where(eq(setlistSongs.id, setlistSongId))
      .limit(1)

    if (song.length === 0) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }

    // Get anonymous limits status
    const status = await getAnonymousLimitsStatus()

    return NextResponse.json({
      ...song[0],
      userVote: null, // Client will check localStorage
      isAnonymous: true,
      sessionId: status.sessionId,
      limits: status.usage.votes,
      resetTime: status.resetTime,
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
