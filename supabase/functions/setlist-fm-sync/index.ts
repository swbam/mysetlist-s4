import { serve } from "std/server";

// Placeholder edge function for setlist.fm sync.
// This stub ensures the Supabase CLI can successfully bundle and deploy the
// function directory even if the real implementation isn’t ready yet.
// Replace the logic inside the handler with actual sync behaviour when ready.

serve(() =>
  new Response(
    JSON.stringify({ ok: true, message: "setlist-fm-sync placeholder" }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    },
  ),
);

