import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  spotifyId: string;
  artistId: string;
}

serve(async (req: Request) => {
  // Get origin from request headers
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const { spotifyId, artistId } = await req.json() as RequestBody;

    if (!spotifyId || !artistId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    // Forward the request to the sync API endpoint
    const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://mysetlist.io";
    const response = await fetch(`${appUrl}/api/artists/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ spotifyId, artistName: undefined, ticketmasterId: undefined }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in sync-song-catalog function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to sync song catalog",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});