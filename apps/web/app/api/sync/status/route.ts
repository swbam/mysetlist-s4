import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get("artistId");

    if (!artistId) {
      return NextResponse.json(
        { error: "artistId query parameter is required" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    });

    // Get the latest import status for the artist
    const { data: importStatus, error } = await supabase
      .from("import_status")
      .select("*")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Failed to fetch import status:", error);

      // Handle invalid UUID format gracefully
      if (error.code === "22P02") {
        return NextResponse.json({
          artistId,
          status: "invalid_id",
          message: "Invalid artist ID format. Expected UUID format.",
          isImporting: false,
        });
      }

      return NextResponse.json(
        { error: "Failed to fetch import status" },
        { status: 500 },
      );
    }

    if (!importStatus) {
      // No import status found - artist might not be importing
      return NextResponse.json({
        artistId,
        status: "not_found",
        message: "No import status found for this artist",
        isImporting: false,
      });
    }

    // Map the database fields to our response format
    const response = {
      artistId,
      status: importStatus.stage,
      progress: importStatus.percentage || 0,
      message: importStatus.message,
      error: importStatus.error || null,
      isImporting:
        importStatus.stage !== "completed" && importStatus.stage !== "failed",
      startedAt: importStatus.created_at,
      updatedAt: importStatus.updated_at,
      completedAt: importStatus.completed_at || null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Sync status API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
      },
      { status: 500 },
    );
  }
}

// Optional: Support HEAD requests for health checks
export async function HEAD(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get("artistId");

  if (!artistId) {
    return new NextResponse(null, { status: 400 });
  }

  return new NextResponse(null, { status: 200 });
}
