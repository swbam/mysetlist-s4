import { createClient } from "~/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const showId = params.id;

    // Get show details for logging
    const { data: show } = await supabase
      .from("shows")
      .select("title, artist:artists(name)")
      .eq("id", showId)
      .single();

    // Delete related records first (setlists, votes, etc.)
    await supabase.from("setlist_songs").delete().eq("show_id", showId);
    await supabase.from("setlists").delete().eq("show_id", showId);
    await supabase.from("votes").delete().eq("show_id", showId);

    // Delete the show
    const { error } = await supabase
      .from("shows")
      .delete()
      .eq("id", showId);

    if (error) {
      throw error;
    }

    // Log the action
    await supabase.from("moderation_logs").insert({
      moderator_id: user.id,
      action: "delete_show",
      target_type: "show",
      target_id: showId,
      reason: "Admin deletion",
      metadata: {
        show_title: show?.title,
        artist_name: show?.artist?.[0]?.name
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting show:", error);
    return NextResponse.json(
      { error: "Failed to delete show" },
      { status: 500 }
    );
  }
}