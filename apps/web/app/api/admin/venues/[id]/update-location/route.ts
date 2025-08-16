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

    // Implement real geocoding using a geocoding service
    let coordinates: { latitude: number; longitude: number } | null = null;
    
    try {
      // Construct address string for geocoding
      const addressString = [venue.address, venue.city, venue.state, venue.country]
        .filter(Boolean)
        .join(', ');

      if (!addressString) {
        return NextResponse.json(
          { error: "Insufficient address information for geocoding" }, 
          { status: 400 }
        );
      }

      // Use OpenStreetMap Nominatim API (free alternative to Google Maps)
      // In production, consider using Google Maps Geocoding API for better accuracy
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}&limit=1`;
      
      const geocodeResponse = await fetch(geocodeUrl, {
        headers: {
          'User-Agent': 'TheSet-Concert-App/1.0'
        }
      });

      if (!geocodeResponse.ok) {
        throw new Error(`Geocoding API error: ${geocodeResponse.status}`);
      }

      const geocodeData = await geocodeResponse.json();
      
      if (geocodeData && geocodeData.length > 0) {
        const location = geocodeData[0];
        coordinates = {
          latitude: parseFloat(location.lat),
          longitude: parseFloat(location.lon),
        };
      } else {
        return NextResponse.json(
          { error: "Could not geocode the provided address" }, 
          { status: 422 }
        );
      }
    } catch (geocodeError) {
      console.error("Geocoding failed:", geocodeError);
      return NextResponse.json(
        { error: "Geocoding service unavailable" }, 
        { status: 503 }
      );
    }

    // Update venue location
    const { error } = await supabase
      .from("venues")
      .update({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
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
        coordinates: coordinates,
        geocoding_service: "OpenStreetMap Nominatim",
        updated_at: new Date().toISOString()
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Location updated successfully",
      coordinates: coordinates
    });
  } catch (error) {
    console.error("Error updating venue location:", error);
    return NextResponse.json(
      { error: "Failed to update venue location" },
      { status: 500 }
    );
  }
}