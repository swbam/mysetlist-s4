import { createClient } from "~/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const venueId = (await params).id;

    // Get venue details
    const { data: venue } = await supabase
      .from("venues")
      .select("name, address, city, state, country")
      .eq("id", venueId)
      .single();

    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    // TODO: Implement actual geocoding API call here
    // For now, we'll just simulate updating with placeholder coordinates
    // In a real implementation, you'd use Google Maps Geocoding API or similar
    
    // Placeholder: Generate mock coordinates based on city/state
    const mockCoordinates = {
      latitude: 40.7128 + Math.random() * 10 - 5, // NYC area +/- 5 degrees
      longitude: -74.0060 + Math.random() * 10 - 5,
    };

    // Update venue location
    const { error } = await supabase
      .from("venues")
      .update({
        latitude: mockCoordinates.latitude,
        longitude: mockCoordinates.longitude,
        updated_at: new Date().toISOString(),
      })
      .eq("id", venueId);

    if (error) {
      throw error;
    }

    // Log the action
    await supabase.from("moderation_logs").insert({
      moderator_id: user.id,
      action: "update_venue_location",
      target_type: "venue",
      target_id: venueId,
      reason: "Location coordinates updated",
      metadata: {
        venue_name: venue.name,
        address: `${venue.address}, ${venue.city}, ${venue.state}`,
        coordinates: mockCoordinates,
        updated_at: new Date().toISOString()
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Location updated successfully",
      coordinates: mockCoordinates
    });
  } catch (error) {
    console.error("Error updating venue location:", error);
    return NextResponse.json(
      { error: "Failed to update venue location" },
      { status: 500 }
    );
  }
}