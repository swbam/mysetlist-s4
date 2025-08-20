import { db, importStatus } from "@repo/database";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { ProgressBus } from "~/lib/services/progress/ProgressBus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Calculate estimated time remaining based on current progress and elapsed time
 */
function calculateEstimatedTime(status: any): number | null {
  if (
    !status.startedAt ||
    status.stage === "completed" ||
    status.stage === "failed"
  ) {
    return null;
  }

  const startTime = new Date(status.startedAt).getTime();
  const currentTime = Date.now();
  const elapsedTime = currentTime - startTime;
  const progress = status.progress || 0;

  if (progress <= 0 || progress >= 100) {
    return null;
  }

  // Estimate total time based on current progress
  const estimatedTotalTime = (elapsedTime / progress) * 100;
  const remainingTime = estimatedTotalTime - elapsedTime;

  // Return remaining time in seconds, minimum 0
  return Math.max(0, Math.floor(remainingTime / 1000));
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  const { id: artistId } = await params;

  if (!artistId) {
    return NextResponse.json(
      { error: "Artist ID is required" },
      { status: 400 },
    );
  }

  try {
    console.log(`[Import Status API] Getting status for artist ${artistId}`);

    // First try to get status from ProgressBus (real-time)
    const liveStatus = await ProgressBus.getStatus(artistId);

    if (liveStatus) {
      console.log(
        `[Import Status API] Found live status for ${artistId}:`,
        liveStatus,
      );
      const status = {
        stage: liveStatus.stage,
        percentage: liveStatus.progress || 0,
        progress: liveStatus.progress || 0, // Alias for compatibility
        message: liveStatus.message,
        error: liveStatus.error,
        startedAt: liveStatus.at,
        updatedAt: liveStatus.at,
        completedAt: liveStatus.stage === "completed" ? liveStatus.at : null,
        isComplete: liveStatus.stage === "completed",
        hasError: liveStatus.stage === "failed" || !!liveStatus.error,
        errorMessage: liveStatus.error,
        artistId,
        estimatedTimeRemaining: calculateEstimatedTime({
          startedAt: liveStatus.at,
          stage: liveStatus.stage,
          progress: liveStatus.progress,
        }),
      };

      return NextResponse.json(status);
    }

    // Fallback to database query for import status
    const dbStatus = await db.query.importStatus.findFirst({
      where: eq(importStatus.artistId, artistId),
    });

    if (dbStatus) {
      console.log(
        `[Import Status API] Found database status for ${artistId}:`,
        dbStatus,
      );
      const status = {
        stage: dbStatus.stage,
        percentage: dbStatus.percentage || 0,
        progress: dbStatus.percentage || 0, // Alias for compatibility
        message: dbStatus.message || "Processing...",
        error: dbStatus.error,
        startedAt:
          dbStatus.startedAt?.toISOString() || dbStatus.createdAt.toISOString(),
        updatedAt: dbStatus.updatedAt.toISOString(),
        completedAt: dbStatus.completedAt?.toISOString() || null,
        isComplete: dbStatus.stage === "completed",
        hasError: dbStatus.stage === "failed",
        errorMessage: dbStatus.error,
        artistId: dbStatus.artistId,
        estimatedTimeRemaining: calculateEstimatedTime({
          startedAt:
            dbStatus.startedAt?.toISOString() ||
            dbStatus.createdAt.toISOString(),
          stage: dbStatus.stage,
          progress: dbStatus.percentage || 0,
        }),
      };

      return NextResponse.json(status);
    }

    // No status found anywhere, return waiting status
    console.log(
      `[Import Status API] No status found for ${artistId}, returning waiting state`,
    );
    return NextResponse.json({
      stage: "initializing",
      percentage: 0,
      progress: 0,
      message: "Waiting for import to start...",
      error: null,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      isComplete: false,
      hasError: false,
      errorMessage: null,
      artistId,
      estimatedTimeRemaining: null,
    });
  } catch (error) {
    console.error(
      `[Import Status API] Error fetching import status for ${artistId}:`,
      error,
    );
    return NextResponse.json(
      {
        error: "Failed to fetch import status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
