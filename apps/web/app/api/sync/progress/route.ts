import { type NextRequest, NextResponse } from "next/server";
import { SyncProgressTracker } from "~/lib/sync-progress-tracker";

const progressTracker = new SyncProgressTracker();

// GET sync progress for an artist or all artists
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get("artistId");

    if (artistId) {
      const progress = await progressTracker.getProgress(artistId);

      if (!progress) {
        return NextResponse.json(
          { error: "No sync in progress for this artist" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        progress,
      });
    }

    // Get all sync progress
    const allProgress = await progressTracker.getAllProgress();

    return NextResponse.json({
      success: true,
      total: allProgress.length,
      inProgress: allProgress.filter((p) => p.status === "in-progress").length,
      completed: allProgress.filter((p) => p.status === "completed").length,
      failed: allProgress.filter((p) => p.status === "failed").length,
      progress: allProgress,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to get sync progress" },
      { status: 500 },
    );
  }
}

// DELETE to clear sync progress
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get("artistId");

    if (!artistId) {
      return NextResponse.json(
        { error: "artistId is required" },
        { status: 400 },
      );
    }

    await progressTracker.clearProgress(artistId);

    return NextResponse.json({
      success: true,
      message: "Sync progress cleared",
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to clear sync progress" },
      { status: 500 },
    );
  }
}
