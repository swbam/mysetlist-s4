import { NextRequest, NextResponse } from "next/server";
import { db } from "@repo/database";
import { setlists } from "@repo/database";
import { and, eq, lt } from "drizzle-orm";
import { env } from "@repo/env";

export async function GET(req: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${env["CRON_SECRET"]}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculate the cutoff time (24 hours ago)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find and lock all predicted setlists that:
    // 1. Are of type 'predicted'
    // 2. Are not already locked
    // 3. Were created more than 24 hours ago
    const result = await db
      .update(setlists)
      .set({
        isLocked: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(setlists.type, "predicted"),
          eq(setlists.isLocked, false),
          lt(setlists.createdAt, cutoffTime),
        ),
      )
      .returning({
        id: setlists.id,
        showId: setlists.showId,
        name: setlists.name,
        totalVotes: setlists.totalVotes,
      });

    // Log the results
    console.log(`Closed ${result.length} polls (predicted setlists)`);

    // Return success response with details
    return NextResponse.json({
      success: true,
      closed: result.length,
      closedPolls: result.map((poll) => ({
        id: poll.id,
        showId: poll.showId,
        name: poll.name,
        totalVotes: poll.totalVotes,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error closing polls:", error);

    return NextResponse.json(
      {
        error: "Failed to close polls",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
