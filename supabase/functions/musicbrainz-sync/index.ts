import { serve } from "std/server";

// Placeholder edge function for MusicBrainz data sync.
// Replace with real implementation when the MusicBrainz pipeline is ready.

serve(() =>
  new Response(
    JSON.stringify({ ok: true, message: "musicbrainz-sync placeholder" }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    },
  ),
);

