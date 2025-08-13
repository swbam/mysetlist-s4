import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const artistId = params.id;

  if (!artistId) {
    return NextResponse.json(
      { error: "Artist ID is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = createRouteHandlerClient({ 
      cookies 
    });

    // Get the most recent import status for this artist
    const { data: importStatus, error } = await supabase
      .from('import_status')
      .select('*')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !importStatus) {
      return NextResponse.json(
        { error: "Import status not found" },
        { status: 404 }
      );
    }

    // Transform to match the expected ImportStatus interface
    const status = {
      stage: importStatus.stage,
      progress: importStatus.percentage || 0,
      message: importStatus.message,
      error: importStatus.error,
      startedAt: importStatus.created_at,
      updatedAt: importStatus.updated_at,
      completedAt: importStatus.completed_at,
      estimatedTimeRemaining: null // We can calculate this if needed
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching import status:", error);
    return NextResponse.json(
      { error: "Failed to fetch import status" },
      { status: 500 }
    );
  }
}
