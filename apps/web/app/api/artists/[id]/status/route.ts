import { type NextRequest, NextResponse } from "next/server";
import { ProgressBus } from "~/lib/services/progress/ProgressBus";

/**
 * GET /api/artists/[id]/status - Polling fallback for import progress
 * Simple JSON endpoint for clients that don't support SSE
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: artistId } = await params;

  if (!artistId) {
    return NextResponse.json(
      { error: "Artist ID is required" },
      { status: 400 }
    );
  }

  try {
    // Get current status from ProgressBus
    const status = await ProgressBus.getStatus(artistId);

    if (!status) {
      // Return default status if no import status exists
      return NextResponse.json({
        stage: "initializing",
        progress: 0,
        message: "Waiting for import to start...",
        updatedAt: new Date().toISOString(),
      });
    }

    // Return exact GROK.md specification: { stage, progress, message, updatedAt }
    const response = {
      stage: status.stage,
      progress: status.progress,
      message: status.message,
      updatedAt: status.at,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("[STATUS] Failed to get import status:", error);
    
    return NextResponse.json(
      {
        error: "Failed to fetch import status",
        details: process.env.NODE_ENV === "development" ? error instanceof Error ? error.message : "Unknown error" : undefined,
      },
      { status: 500 }
    );
  }
}