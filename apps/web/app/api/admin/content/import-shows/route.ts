import { createClient } from "~/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { TicketmasterClient } from "@repo/external-apis";

export async function POST(request: NextRequest) {
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

    // Get request body with import parameters
    const body = await request.json();
    const { artistName, limit = 50 } = body;

    if (!artistName) {
      return NextResponse.json(
        { error: "Artist name is required" },
        { status: 400 }
      );
    }

    // Initialize Ticketmaster client
    const ticketmasterApiKey = process.env['TICKETMASTER_API_KEY'];
    if (!ticketmasterApiKey) {
      return NextResponse.json(
        { error: "Ticketmaster API key not configured" },
        { status: 500 }
      );
    }

    const ticketmaster = new TicketmasterClient({
      apiKey: ticketmasterApiKey,
    });

    let importedCount = 0;
    let venuesImported = 0;

    try {
      // Search for events using real Ticketmaster API
      const eventsResponse = await ticketmaster.searchEvents({
        keyword: artistName,
        size: limit,
      });

      const events = eventsResponse._embedded?.events || [];

      for (const event of events) {
        try {
          // Import venue first if it has one
          let venueId = null;
          if (event._embedded?.venues?.[0]) {
            const venue = event._embedded.venues[0];
            
            const { data: existingVenue } = await supabase
              .from("venues")
              .select("id")
              .eq("ticketmaster_id", venue.id)
              .single();

            if (existingVenue) {
              venueId = existingVenue.id;
            } else {
              // Create new venue
              const { data: newVenue, error: venueError } = await supabase
                .from("venues")
                .insert({
                  ticketmaster_id: venue.id,
                  name: venue.name,
                  city: venue.city?.name || "Unknown",
                  state: venue.state?.stateCode || null,
                  country: venue.country?.countryCode || "US",
                  address: venue.address?.line1 || null,
                  postal_code: venue.postalCode || null,
                  timezone: venue.timezone || "America/New_York",
                  latitude: venue.location?.latitude ? parseFloat(venue.location.latitude) : null,
                  longitude: venue.location?.longitude ? parseFloat(venue.location.longitude) : null,
                  created_at: new Date().toISOString(),
                })
                .select("id")
                .single();

              if (!venueError && newVenue) {
                venueId = newVenue.id;
                venuesImported++;
              }
            }
          }

          // Import show
          const showDate = event.dates?.start?.localDate || null;
          const { error: showError } = await supabase
            .from("shows")
            .insert({
              ticketmaster_id: event.id,
              name: event.name,
              date: showDate,
              status: "upcoming",
              ticket_url: event.url || null,
              venue_id: venueId,
              created_at: new Date().toISOString(),
            });

          if (!showError) {
            importedCount++;
          }
        } catch (insertError) {
          console.error("Error inserting show:", insertError);
        }
      }
    } catch (apiError) {
      console.error("Ticketmaster API error:", apiError);
      return NextResponse.json(
        { error: "Failed to fetch shows from Ticketmaster API" },
        { status: 500 }
      );
    }

    // Log the import action
    await supabase.from("moderation_logs").insert({
      moderator_id: user.id,
      action: "import_shows",
      target_type: "system",
      target_id: "bulk_import",
      reason: "Bulk show import initiated from admin panel",
      metadata: {
        artist_name: artistName,
        shows_imported: importedCount,
        venues_imported: venuesImported,
        import_timestamp: new Date().toISOString()
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Shows import completed",
      shows_imported: importedCount,
      venues_imported: venuesImported
    });
  } catch (error) {
    console.error("Error importing shows:", error);
    return NextResponse.json(
      { error: "Failed to import shows" },
      { status: 500 }
    );
  }
}