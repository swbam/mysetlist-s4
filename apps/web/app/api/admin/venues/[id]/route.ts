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

    const venueId = params.id;

    // Get venue details for logging
    const { data: venue } = await supabase
      .from("venues")
      .select("name, city, state")
      .eq("id", venueId)
      .single();

    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    // Delete related records first
    await supabase.from("setlist_songs").delete().in("show_id", 
      (await supabase.from("shows").select("id").eq("venue_id", venueId)).data?.map(s => s.id) || []
    );
    await supabase.from("setlists").delete().in("show_id", 
      (await supabase.from("shows").select("id").eq("venue_id", venueId)).data?.map(s => s.id) || []
    );
    await supabase.from("votes").delete().in("show_id", 
      (await supabase.from("shows").select("id").eq("venue_id", venueId)).data?.map(s => s.id) || []
    );
    await supabase.from("shows").delete().eq("venue_id", venueId);
    await supabase.from("venue_reviews").delete().eq("venue_id", venueId);
    await supabase.from("venue_photos").delete().eq("venue_id", venueId);

    // Delete the venue
    const { error } = await supabase
      .from("venues")
      .delete()
      .eq("id", venueId);

    if (error) {
      throw error;
    }

    // Log the action
    await supabase.from("moderation_logs").insert({
      moderator_id: user.id,
      action: "delete_venue",
      target_type: "venue",
      target_id: venueId,
      reason: "Admin deletion",
      metadata: {
        venue_name: venue.name,
        venue_location: `${venue.city}, ${venue.state}`
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting venue:", error);
    return NextResponse.json(
      { error: "Failed to delete venue" },
      { status: 500 }
    );
  }
}