import { db, importStatus } from "@repo/database";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ProgressBus } from "~/lib/services/progress/ProgressBus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteParams) {
  const { id: artistId } = await params;

  try {
    // First try to get status from ProgressBus (real-time)
    const liveStatus = await ProgressBus.getStatus(artistId);

    if (liveStatus) {
      return NextResponse.json({
        artistId,
        stage: liveStatus.stage,
        progress: liveStatus.progress,
        percentage: liveStatus.progress, // For backward compatibility
        message: liveStatus.message,
        error: liveStatus.error,
        updatedAt: liveStatus.at,
        isComplete: liveStatus.stage === "completed",
        hasError: liveStatus.stage === "failed" || !!liveStatus.error,
      });
    }

    // Fallback to database query for import status
    const status = await db.query.importStatus.findFirst({
      where: eq(importStatus.artistId, artistId),
    });

    if (status) {
      return NextResponse.json({
        artistId: status.artistId,
        stage: status.stage,
        progress: status.percentage || 0,
        percentage: status.percentage || 0, // For backward compatibility
        message: status.message || "Processing...",
        error: status.error,
        updatedAt: status.updatedAt.toISOString(),
        createdAt: status.createdAt.toISOString(),
        startedAt: status.startedAt?.toISOString(),
        completedAt: status.completedAt?.toISOString(),
        isComplete: status.stage === "completed",
        hasError: status.stage === "failed",
        jobId: status.jobId,
        artistName: status.artistName,
      });
    }

    // No status found
    return NextResponse.json({
      artistId,
      stage: "unknown",
      progress: 0,
      percentage: 0,
      message: "No import status found",
      isComplete: false,
      hasError: false,
    });
  } catch (error) {
    console.error(`Error getting status for artist ${artistId}:`, error);
    return NextResponse.json(
      {
        artistId,
        stage: "error",
        progress: 0,
        percentage: 0,
        message: "Failed to get import status",
        error: error instanceof Error ? error.message : "Unknown error",
        isComplete: false,
        hasError: true,
      },
      { status: 500 },
    );
  }
}
