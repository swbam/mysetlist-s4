// deno-lint-ignore-file no-explicit-any
// @ts-nocheck  Supabase Edge Runtime (Deno)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, serviceKey);

interface Payload {
  type?: "all" | "trending" | "artists";
  limit?: number; // optional cap for batch jobs
}

async function syncPopularArtists(limit = 20) {
  try {
    const { data, error } = await supabase.functions.invoke("sync-artists", {
      body: { limit },
    });

    if (error) {
      console.error("Failed to sync popular artists:", error);
      throw new Error(`Artist sync failed: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Artist sync error:", error);
    throw error;
  }
}

async function updateTrending() {
  try {
    const { data, error } = await supabase.functions.invoke("update-trending");

    if (error) {
      console.error("Failed to update trending:", error);
      // Don't throw - trending update is non-critical
      return null;
    }

    return data;
  } catch (error) {
    console.error("Trending update error:", error);
    // Don't throw - trending update is non-critical
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { type = "all", limit = 20 } = (await req.json()) as Payload;

  const results = {
    artistSync: null as unknown,
    trendingUpdate: null as unknown,
    errors: [] as string[],
  };

  try {
    if (type === "all" || type === "artists") {
      try {
        results.artistSync = await syncPopularArtists(limit);
      } catch (error) {
        results.errors.push(`Artist sync failed: ${error.message}`);
        // Continue with other tasks
      }
    }

    if (type === "all" || type === "trending") {
      try {
        results.trendingUpdate = await updateTrending();
      } catch (error) {
        results.errors.push(`Trending update failed: ${error.message}`);
        // Continue - this is non-critical
      }
    }

    const hasErrors = results.errors.length > 0;
    const statusCode = hasErrors ? 207 : 200; // 207 = Multi-Status

    return new Response(
      JSON.stringify({
        success: !hasErrors || results.errors.length < 2,
        ran: type,
        results: {
          artistSync: results.artistSync,
          trendingUpdate: results.trendingUpdate,
        },
        errors: results.errors.length > 0 ? results.errors : undefined,
      }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("Scheduled sync fatal error:", e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e.message || "Unknown error occurred",
        type: "fatal",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
