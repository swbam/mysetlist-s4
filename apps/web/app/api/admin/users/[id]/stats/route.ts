import { createClient } from "~/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: any,
) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = params.id;

    // Get user statistics
    const [
      setlistsResult,
      reviewsResult,
      votesResult,
      photosResult
    ] = await Promise.all([
      supabase.from("setlists").select("id", { count: "exact" }).eq("user_id", userId),
      supabase.from("venue_reviews").select("id", { count: "exact" }).eq("user_id", userId),
      supabase.from("votes").select("id", { count: "exact" }).eq("user_id", userId),
      supabase.from("venue_photos").select("id", { count: "exact" }).eq("user_id", userId)
    ]);

    const stats = {
      setlists_created: setlistsResult.count || 0,
      reviews_written: reviewsResult.count || 0,
      votes_cast: votesResult.count || 0,
      photos_uploaded: photosResult.count || 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch user stats" },
      { status: 500 }
    );
  }
}