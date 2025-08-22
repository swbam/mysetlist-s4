import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface SyncRequest {
  force?: boolean;
  limit?: number;
  days_ahead?: number;
}

interface SyncResponse {
  success: boolean;
  synced: number;
  errors: number;
  message: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify cron secret for automated requests
    const cronSecret = req.headers.get("cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");

    if (cronSecret && cronSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Invalid cron secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body for parameters
    let options: SyncRequest = { limit: 200, force: false, days_ahead: 90 };

    if (req.method === "POST") {
      try {
        const body = await req.json();
        options = { ...options, ...body };
      } catch (e) {
        // Ignore JSON parse errors for GET requests
      }
    }

    console.log("Starting concert sync with options:", options);

    // Import Supabase client
    const { createClient } = await import("jsr:@supabase/supabase-js@2");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ticketmaster API credentials
    const ticketmasterApiKey = Deno.env.get("TICKETMASTER_API_KEY");

    if (!ticketmasterApiKey) {
      throw new Error("Ticketmaster API key not configured");
    }

    // Get artists with Spotify IDs to search for concerts
    const { data: artists, error: fetchError } = await supabase
      .from("artists")
      .select("id, name, spotify_id")
      .not("spotify_id", "is", null)
      .limit(options.limit);

    if (fetchError) {
      throw new Error(`Failed to fetch artists: ${fetchError.message}`);
    }

    if (!artists || artists.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          synced: 0,
          errors: 0,
          message: "No artists found for concert sync",
        } as SyncResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Found ${artists.length} artists to search for concerts`);

    let synced = 0;
    let errors = 0;

    // Calculate date range for search
    const startDate = new Date().toISOString().split("T")[0];
    const endDate = new Date(
      Date.now() + options.days_ahead * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .split("T")[0];

    // Process artists in batches
    for (const artist of artists) {
      try {
        // Search for events on Ticketmaster
        const searchUrl = new URL(
          "https://app.ticketmaster.com/discovery/v2/events.json",
        );
        searchUrl.searchParams.set("apikey", ticketmasterApiKey);
        searchUrl.searchParams.set("keyword", artist.name);
        searchUrl.searchParams.set("classificationName", "Music");
        searchUrl.searchParams.set("startDateTime", `${startDate}T00:00:00Z`);
        searchUrl.searchParams.set("endDateTime", `${endDate}T23:59:59Z`);
        searchUrl.searchParams.set("size", "50");
        searchUrl.searchParams.set("sort", "date,asc");

        const response = await fetch(searchUrl.toString());

        if (!response.ok) {
          console.error(
            `Ticketmaster API error for ${artist.name}: ${response.status}`,
          );
          errors++;
          continue;
        }

        const data = await response.json();
        const events = data._embedded?.events || [];

        for (const event of events) {
          try {
            // Extract venue information
            const venue = event._embedded?.venues?.[0];
            let venueId = null;

            if (venue) {
              // Check if venue exists, create if not
              const { data: existingVenue, error: venueSelectError } =
                await supabase
                  .from("venues")
                  .select("id")
                  .eq("tm_venue_id", venue.id)
                  .single();

              if (venueSelectError && venueSelectError.code !== "PGRST116") {
                console.error(
                  `Error checking venue: ${venueSelectError.message}`,
                );
                continue;
              }

              if (!existingVenue) {
                const { data: newVenue, error: venueInsertError } =
                  await supabase
                    .from("venues")
                    .insert({
                      name: venue.name,
                      city: venue.city?.name,
                      state: venue.state?.stateCode,
                      country: venue.country?.countryCode,
                      tm_venue_id: venue.id,
                      ticketmaster_data: venue,
                    })
                    .select("id")
                    .single();

                if (venueInsertError) {
                  console.error(
                    `Error creating venue: ${venueInsertError.message}`,
                  );
                  continue;
                }

                venueId = newVenue.id;
              } else {
                venueId = existingVenue.id;
              }
            }

            // Check if show already exists
            const { data: existingShow, error: showSelectError } =
              await supabase
                .from("shows")
                .select("id")
                .eq("tm_event_id", event.id)
                .single();

            if (showSelectError && showSelectError.code !== "PGRST116") {
              console.error(`Error checking show: ${showSelectError.message}`);
              continue;
            }

            if (!existingShow) {
              // Create new show
              const { error: showInsertError } = await supabase
                .from("shows")
                .insert({
                  name: event.name,
                  date: event.dates?.start?.localDate,
                  time: event.dates?.start?.localTime,
                  artist_id: artist.id,
                  venue_id: venueId,
                  tm_event_id: event.id,
                  ticketmaster_data: event,
                  status: "upcoming",
                });

              if (showInsertError) {
                console.error(
                  `Error creating show: ${showInsertError.message}`,
                );
                errors++;
              } else {
                synced++;
                console.log(`Created show: ${event.name} for ${artist.name}`);
              }
            } else {
              // Update existing show with latest data
              const { error: showUpdateError } = await supabase
                .from("shows")
                .update({
                  ticketmaster_data: event,
                })
                .eq("id", existingShow.id);

              if (showUpdateError) {
                console.error(
                  `Error updating show: ${showUpdateError.message}`,
                );
                errors++;
              }
            }
          } catch (eventError) {
            console.error(
              `Error processing event for ${artist.name}:`,
              eventError,
            );
            errors++;
          }
        }

        // Rate limiting - Ticketmaster allows 5 requests per second
        await new Promise((resolve) => setTimeout(resolve, 250));
      } catch (error) {
        console.error(`Error processing artist ${artist.name}:`, error);
        errors++;
      }
    }

    const response: SyncResponse = {
      success: true,
      synced,
      errors,
      message: `Processed ${artists.length} artists: ${synced} shows synced, ${errors} errors`,
    };

    console.log("Concert sync completed:", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Concert sync error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        synced: 0,
        errors: 1,
        message: error.message,
      } as SyncResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
