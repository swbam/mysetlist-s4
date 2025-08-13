import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TicketmasterEvent {
  id: string;
  name: string;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
    };
  };
  priceRanges?: Array<{
    min: number;
    max: number;
    currency: string;
  }>;
  _embedded: {
    venues: Array<{
      id: string;
      name: string;
      city: { name: string };
      state?: { name: string; stateCode: string };
      country: { name: string; countryCode: string };
      location?: { longitude: string; latitude: string };
      timezone: string;
      address?: { line1: string };
    }>;
    attractions?: Array<{
      id: string;
      name: string;
    }>;
  };
  url: string;
  sales?: {
    public?: {
      startDateTime: string;
      endDateTime: string;
    };
  };
}

async function fetchTicketmasterEvents(params: {
  keyword?: string;
  attractionId?: string;
  city?: string;
  startDateTime?: string;
  endDateTime?: string;
  size?: number;
}): Promise<TicketmasterEvent[]> {
  const apiKey = Deno.env.get("TICKETMASTER_API_KEY");

  if (!apiKey) {
    throw new Error("Ticketmaster API key not configured");
  }

  const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("classificationName", "Music");
  url.searchParams.set("sort", "date,asc");

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value.toString());
    }
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch events from Ticketmaster: ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data._embedded?.events || [];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { artistName, artistId, city, dateRange } = await req.json();

    if (!artistName && !artistId) {
      return new Response(
        JSON.stringify({ error: "Either artistName or artistId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch events from Ticketmaster
    const events = await fetchTicketmasterEvents({
      keyword: artistName,
      attractionId: artistId,
      city,
      startDateTime: dateRange?.start,
      endDateTime: dateRange?.end,
      size: 50,
    });

    // biome-ignore lint/suspicious/noExplicitAny: Complex API response structure
    const syncedShows = [] as any[];

    for (const event of events) {
      const venue = event._embedded.venues[0];
      const mainArtist = event._embedded.attractions?.[0];

      if (!venue || !mainArtist) {
        continue;
      }

      // First, ensure venue exists
      const venueData = {
        name: venue.name,
        slug: venue.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        city: venue.city.name,
        state: venue.state?.name || null,
        country: venue.country.name,
        latitude: venue.location?.latitude
          ? Number.parseFloat(venue.location.latitude)
          : null,
        longitude: venue.location?.longitude
          ? Number.parseFloat(venue.location.longitude)
          : null,
        timezone: venue.timezone,
        address: venue.address?.line1 || null,
        // biome-ignore lint/suspicious/noExplicitAny: Database insert type
      } as unknown;

      const { data: dbVenue } = await supabase
        .from("venues")
        .upsert(venueData, {
          onConflict: "slug",
        })
        .select()
        .single();

      // Ensure artist exists in database
      let { data: dbArtist } = await supabase
        .from("artists")
        .select("*")
        .eq("name", mainArtist.name)
        .single();

      if (!dbArtist) {
        // Create a basic artist entry
        const { data: newArtist } = await supabase
          .from("artists")
          .insert({
            name: mainArtist.name,
            slug: mainArtist.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, ""),
          })
          .select()
          .single();

        dbArtist = newArtist;
      }

      if (!dbVenue || !dbArtist) {
        continue;
      }

      // Calculate price info
      const priceRange = event.priceRanges?.[0];
      const minPrice = priceRange?.min ? Math.floor(priceRange.min) : null;
      const maxPrice = priceRange?.max ? Math.floor(priceRange.max) : null;

      // Prepare show data
      const showData = {
        headliner_artist_id: dbArtist.id,
        venue_id: dbVenue.id,
        name: event.name,
        slug: `${event.dates.start.localDate}-${dbArtist.slug}-${dbVenue.slug}`
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-"),
        date: event.dates.start.localDate,
        start_time: event.dates.start.localTime || null,
        ticket_url: event.url,
        min_price: minPrice,
        max_price: maxPrice,
        currency: priceRange?.currency || "USD",
        ticketmaster_id: event.id,
        status:
          new Date(event.dates.start.localDate) > new Date()
            ? "upcoming"
            : "completed",
      } as unknown;

      // Upsert show
      const { data: show, error: showError } = await supabase
        .from("shows")
        .upsert(showData, {
          onConflict: "slug",
        })
        .select()
        .single();

      if (showError) {
        continue;
      }

      // Add supporting artists if any
      if (
        event._embedded.attractions &&
        event._embedded.attractions.length > 1
      ) {
        for (let i = 1; i < event._embedded.attractions.length; i++) {
          const supportingArtist = event._embedded.attractions[i];

          // Ensure supporting artist exists
          let { data: dbSupportingArtist } = await supabase
            .from("artists")
            .select("*")
            .eq("name", supportingArtist.name)
            .single();

          if (!dbSupportingArtist) {
            const { data: newArtist } = await supabase
              .from("artists")
              .insert({
                name: supportingArtist.name,
                slug: supportingArtist.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, ""),
              })
              .select()
              .single();

            dbSupportingArtist = newArtist;
          }

          if (dbSupportingArtist) {
            await supabase.from("show_artists").upsert(
              {
                show_id: show.id,
                artist_id: dbSupportingArtist.id,
                order_index: i,
                is_headliner: false,
              },
              {
                onConflict: "show_id,artist_id",
              },
            );
          }
        }
      }

      syncedShows.push(show);
    }

    return new Response(
      JSON.stringify({
        shows: syncedShows,
        totalEvents: events.length,
        syncedCount: syncedShows.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
