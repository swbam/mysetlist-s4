// deno-lint-ignore-file no-explicit-any
// @ts-nocheck - Supabase Edge Runtime (Deno)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * update-trending
 * ------------
 * Edge function that periodically recalculates and persists `trending_score`
 * for artists, shows and venues.  Deployed via Supabase MCP and invoked by the
 * scheduled-sync job (or on-demand).
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceKey) {
  throw new Error(
    "Missing Supabase env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

function calcArtistScore(
  popularity: number,
  followers: number,
  followerCount: number,
) {
  return (
    Math.round(
      (popularity * 0.3 +
        (followers / 1000) * 0.4 +
        (followerCount / 100) * 0.3) *
        100,
    ) / 100
  );
}

function calcShowScore(
  viewCount: number,
  voteCount: number,
  attendeeCount: number,
) {
  return (
    Math.round(
      (viewCount * 0.2 + voteCount * 0.5 + attendeeCount * 0.3) * 100,
    ) / 100
  );
}

function calcVenueScore(showCount: number, capacity: number | null = 0) {
  return (
    Math.round((showCount * 1 + (capacity ? capacity / 1000 : 0) * 0.5) * 100) /
    100
  );
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // 1. Update artists --------------------------------------------------
    const { data: artists } = await supabase
      .from("artists")
      .select("id, popularity, followers, follower_count");

    if (artists) {
      for (const artist of artists) {
        const score = calcArtistScore(
          artist.popularity ?? 0,
          artist.followers ?? 0,
          artist.follower_count ?? 0,
        );
        await supabase
          .from("artists")
          .update({ trending_score: score })
          .eq("id", artist.id);
      }
    }

    // 2. Update shows ----------------------------------------------------
    const { data: shows } = await supabase
      .from("shows")
      .select("id, view_count, vote_count, attendee_count");

    if (shows) {
      for (const show of shows) {
        const score = calcShowScore(
          show.view_count ?? 0,
          show.vote_count ?? 0,
          show.attendee_count ?? 0,
        );
        await supabase
          .from("shows")
          .update({ trending_score: score })
          .eq("id", show.id);
      }
    }

    // 3. Update venues ---------------------------------------------------
    // First fetch show counts per venue
    const { data: venueAgg } = await supabase
      .from("shows")
      .select("venue_id, count:count(*)")
      .group("venue_id");

    const showCountMap: Record<string, number> = {};
    if (venueAgg) {
      for (const record of venueAgg as { venue_id: string; count: number }[]) {
        if (record.venue_id) {
          showCountMap[record.venue_id] = record.count;
        }
      }
    }

    const { data: venues } = await supabase
      .from("venues")
      .select("id, capacity");

    if (venues) {
      for (const venue of venues) {
        const score = calcVenueScore(
          showCountMap[venue.id] ?? 0,
          venue.capacity,
        );
        await supabase
          .from("venues")
          .update({
            show_count: showCountMap[venue.id] ?? 0,
            trending_score: score,
          })
          .eq("id", venue.id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
