import { serve } from "std/server";
import { sql } from "../../../packages/database";

serve(async () => {
  try {
    await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY trending_artists_mv`;
    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("trending_refresh failed", error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

