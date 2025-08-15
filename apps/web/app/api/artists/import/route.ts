import { type NextRequest, NextResponse } from "next/server";
import { initiateImport } from "~/lib/services/orchestrators/ArtistImportOrchestrator";

/**
 * POST /api/artists/import - Kickoff endpoint for artist imports
 * Implements GROK.md Phase 1: Identity/Bootstrap (< 200ms)
 * Returns artist shell immediately for instant page loads
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tmAttractionId } = body;

    if (!tmAttractionId) {
      return NextResponse.json(
        { error: "tmAttractionId is required" },
        { status: 400 }
      );
    }

    // Phase 1: Create artist record immediately (< 200ms)
    const result = await initiateImport(tmAttractionId);

    return NextResponse.json(
      {
        artistId: result.artistId,
        slug: result.slug,
        success: true,
        message: "Artist created successfully. Use the stream endpoint for progress updates."
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("[IMPORT] Import kickoff failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to initiate import",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

