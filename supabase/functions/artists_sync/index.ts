import { serve } from "std/server";
import { syncTrendingArtists } from "../../../apps/web/lib/sync/artists";

serve(async () => {
  try {
    await syncTrendingArtists();
    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("artists_sync failed", error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

