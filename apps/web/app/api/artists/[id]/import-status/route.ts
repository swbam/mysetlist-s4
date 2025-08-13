import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Calculate estimated time remaining based on current progress and elapsed time
 */
function calculateEstimatedTime(importStatus: any): number | null {
  if (
    !importStatus.created_at ||
    importStatus.stage === "completed" ||
    importStatus.stage === "failed"
  ) {
    return null;
  }

  const startTime = new Date(importStatus.created_at).getTime();
  const currentTime = Date.now();
  const elapsedTime = currentTime - startTime;
  const progress = importStatus.percentage || 0;

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
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: artistId } = await params;

  if (!artistId) {
    return NextResponse.json(
      { error: "Artist ID is required" },
      { status: 400 },
    );
  }

  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({
      cookies: () => Promise.resolve(cookieStore),
    });

    // Get the most recent import status for this artist
    const { data: importStatus, error } = await supabase
      .from("import_status")
      .select("*")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching import status:", error);
      return NextResponse.json(
        { error: "Failed to fetch import status", details: error.message },
        { status: 500 },
      );
    }

    if (!importStatus) {
      // Return a default "waiting" status if no import status exists yet
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
        artistId: artistId,
        estimatedTimeRemaining: null,
      });
    }

    // Transform to match the expected ImportStatus interface
    const status = {
      stage: importStatus.stage,
      percentage: importStatus.percentage || 0,
      progress: importStatus.percentage || 0, // Alias for compatibility
      message: importStatus.message,
      error: importStatus.error,
      startedAt: importStatus.created_at,
      updatedAt: importStatus.updated_at,
      completedAt: importStatus.completed_at,
      isComplete: importStatus.stage === "completed",
      hasError: importStatus.stage === "failed",
      errorMessage: importStatus.error,
      artistId: importStatus.artist_id,
      estimatedTimeRemaining: calculateEstimatedTime(importStatus),
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching import status:", error);
    return NextResponse.json(
      { error: "Failed to fetch import status" },
      { status: 500 },
    );
  }
}
