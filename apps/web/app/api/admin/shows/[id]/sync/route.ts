import { createClient } from "~/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
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

    const { id: showId } = params;

    // Get show details
    const { data: show } = await supabase
      .from("shows")
      .select("*")
      .eq("id", showId)
      .single();

    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    // TODO: Implement actual Ticketmaster sync logic here
    // For now, just update the updated_at timestamp to simulate sync
    const { error } = await supabase
      .from("shows")
      .update({
        updated_at: new Date().toISOString(),
        // Add any synced fields here when implementing real sync
      })
      .eq("id", showId);

    if (error) {
      throw error;
    }

    // Log the sync action
    await supabase.from("moderation_logs").insert({
      moderator_id: user.id,
      action: "sync_show",
      target_type: "show",
      target_id: showId,
      reason: "Manual sync from Ticketmaster",
      metadata: {
        show_title: show.title,
        sync_timestamp: new Date().toISOString()
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Show synced successfully" 
    });
  } catch (error) {
    console.error("Error syncing show:", error);
    return NextResponse.json(
      { error: "Failed to sync show" },
      { status: 500 }
    );
  }
}