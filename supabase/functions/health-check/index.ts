import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    database: "up" | "down";
    spotify: "up" | "down" | "not_configured";
    ticketmaster: "up" | "down" | "not_configured";
    setlist_fm: "up" | "down" | "not_configured";
  };
  stats: {
    total_artists: number;
    total_shows: number;
    total_setlists: number;
    total_votes: number;
  };
  version: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { createClient } = await import("jsr:@supabase/supabase-js@2");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize health status
    const health: HealthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "down",
        spotify: "not_configured",
        ticketmaster: "not_configured",
        setlist_fm: "not_configured",
      },
      stats: {
        total_artists: 0,
        total_shows: 0,
        total_setlists: 0,
        total_votes: 0,
      },
      version: "1.0.0",
    };

    // Test database connection
    try {
      const { count: artistCount } = await supabase
        .from("artists")
        .select("*", { count: "exact", head: true });

      const { count: showCount } = await supabase
        .from("shows")
        .select("*", { count: "exact", head: true });

      const { count: setlistCount } = await supabase
        .from("setlists")
        .select("*", { count: "exact", head: true });

      const { count: voteCount } = await supabase
        .from("votes")
        .select("*", { count: "exact", head: true });

      health.services.database = "up";
      health.stats = {
        total_artists: artistCount || 0,
        total_shows: showCount || 0,
        total_setlists: setlistCount || 0,
        total_votes: voteCount || 0,
      };
    } catch (error) {
      console.error("Database health check failed:", error);
      health.services.database = "down";
      health.status = "unhealthy";
    }

    // Test Spotify API
    const spotifyClientId = Deno.env.get("SPOTIFY_CLIENT_ID");
    const spotifyClientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");

    if (spotifyClientId && spotifyClientSecret) {
      try {
        const tokenResponse = await fetch(
          "https://accounts.spotify.com/api/token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${btoa(`${spotifyClientId}:${spotifyClientSecret}`)}`,
            },
            body: "grant_type=client_credentials",
          },
        );

        if (tokenResponse.ok) {
          health.services.spotify = "up";
        } else {
          health.services.spotify = "down";
          health.status = "degraded";
        }
      } catch (error) {
        console.error("Spotify health check failed:", error);
        health.services.spotify = "down";
        health.status = "degraded";
      }
    }

    // Test Ticketmaster API
    const ticketmasterApiKey = Deno.env.get("TICKETMASTER_API_KEY");

    if (ticketmasterApiKey) {
      try {
        const testResponse = await fetch(
          `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${ticketmasterApiKey}&size=1`,
          { signal: AbortSignal.timeout(5000) },
        );

        if (testResponse.ok) {
          health.services.ticketmaster = "up";
        } else {
          health.services.ticketmaster = "down";
          health.status = "degraded";
        }
      } catch (error) {
        console.error("Ticketmaster health check failed:", error);
        health.services.ticketmaster = "down";
        health.status = "degraded";
      }
    }

    // Test Setlist.fm API
    const setlistFmApiKey = Deno.env.get("SETLISTFM_API_KEY");

    if (setlistFmApiKey) {
      try {
        const testResponse = await fetch(
          "https://api.setlist.fm/rest/1.0/search/setlists?p=1",
          {
            headers: {
              "x-api-key": setlistFmApiKey,
              Accept: "application/json",
              "User-Agent": "TheSetApp/1.0",
            },
            signal: AbortSignal.timeout(5000),
          },
        );

        if (testResponse.ok) {
          health.services.setlist_fm = "up";
        } else {
          health.services.setlist_fm = "down";
          health.status = "degraded";
        }
      } catch (error) {
        console.error("Setlist.fm health check failed:", error);
        health.services.setlist_fm = "down";
        health.status = "degraded";
      }
    }

    return new Response(JSON.stringify(health), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Health check error:", error);

    const errorHealth: HealthStatus = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "down",
        spotify: "not_configured",
        ticketmaster: "not_configured",
        setlist_fm: "not_configured",
      },
      stats: {
        total_artists: 0,
        total_shows: 0,
        total_setlists: 0,
        total_votes: 0,
      },
      version: "1.0.0",
    };

    return new Response(JSON.stringify(errorHealth), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
