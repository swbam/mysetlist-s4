import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  ticketmasterId: string;
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
    const { ticketmasterId, artistId } = await req.json() as RequestBody;

    if (!ticketmasterId || !artistId) {
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
    const response = await fetch(`${appUrl}/api/sync/shows`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ artistId, ticketmasterId }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in sync-artist-shows function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to sync artist shows",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }
});