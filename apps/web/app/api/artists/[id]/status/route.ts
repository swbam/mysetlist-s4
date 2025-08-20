import { NextResponse } from "next/server";
import { db, importStatus } from "@repo/database";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: any,
) {
  try {
    const status = await db.query.importStatus.findFirst({
      where: eq(importStatus.artistId, params.id),
    });

    if (!status) {
      return NextResponse.json({
        stage: "unknown",
        progress: 0,
        message: "No import status found",
        at: new Date().toISOString(),
      });
    }

    // Transform to match ImportProgressData format
    const response = {
      stage: status.stage,
      progress: status.percentage || 0,
      message: status.message || "",
      at: status.startedAt?.toISOString() || new Date().toISOString(),
      error: status.error || undefined,
      metadata: {
        stats: {
          songsImported: status.totalSongs || 0,
          showsImported: status.totalShows || 0,
          venuesImported: status.totalVenues || 0,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching import status:", error);
    return NextResponse.json(
      {
        stage: "failed",
        progress: 0,
        message: "Error fetching import status",
        error: error instanceof Error ? error.message : "Unknown error",
        at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
