import { serve } from "std/server";
import { syncUpcomingShows } from "../../../apps/web/lib/sync/shows";

serve(async () => {
  try {
    await syncUpcomingShows();
    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("shows_sync failed", error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

