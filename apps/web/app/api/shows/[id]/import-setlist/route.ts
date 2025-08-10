import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "~/lib/auth";
import { createClient } from "~/lib/supabase/server";
import { importActualSetlistFromSetlistFm } from "~/app/shows/[slug]/actions";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const showId = params.id;
    
    if (!showId) {
      return NextResponse.json(
        { error: "Show ID is required" },
        { status: 400 }
      );
    }

    // Validate that the show exists and is in the past
    const supabase = await createClient();
    const { data: show } = await supabase
      .from("shows")
      .select("id, date, headliner_artist:artists(name)")
      .eq("id", showId)
      .single();

    if (!show) {
      return NextResponse.json(
        { error: "Show not found" },
        { status: 404 }
      );
    }

    const showDate = new Date(show.date);
    const now = new Date();
    
    if (showDate >= now) {
      return NextResponse.json(
        { error: "Can only import setlists for past shows" },
        { status: 400 }
      );
    }

    // Check if actual setlist already exists
    const { data: existingActualSetlist } = await supabase
      .from("setlists")
      .select("id")
      .eq("show_id", showId)
      .eq("type", "actual")
      .single();

    if (existingActualSetlist) {
      return NextResponse.json(
        { error: "Actual setlist already exists for this show" },
        { status: 409 }
      );
    }

    // Import the setlist
    const result = await importActualSetlistFromSetlistFm(showId);
    
    if (result.success) {
      return NextResponse.json({
        message: result.message,
        setlist: result.setlist
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 404 }
      );
    }

  } catch (error: any) {
    console.error("Error importing setlist:", error);
    
    return NextResponse.json(
      { error: error.message || "Failed to import setlist" },
      { status: 500 }
    );
  }
}