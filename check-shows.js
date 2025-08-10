const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkShows() {
  // Get artists first
  const { data: artists, error: artistsError } = await supabase
    .from("artists")
    .select("id, name, spotify_id")
    .limit(5);

  if (artistsError) {
    console.error("Error fetching artists:", artistsError);
    return;
  }

  console.log("Artists in database:", artists.length);
  console.log("Sample artists:", artists.map((a) => a.name).join(", "));

  // Get shows count
  const { data: shows, error: showsError } = await supabase
    .from("shows")
    .select(
      "id, name, headliner_artist_id, date, venue_id, previous_vote_count",
    )
    .limit(10);

  if (showsError) {
    console.error("Error fetching shows:", showsError);
    return;
  }

  console.log("\nShows in database:", shows.length);

  // Check if previous_vote_count column exists
  if (shows.length > 0) {
    console.log("Sample show structure:", Object.keys(shows[0]));
    console.log(
      "previous_vote_count values:",
      shows.map((s) => s.previous_vote_count),
    );
  }

  // Try a direct query
  const { data: testData, error: testError } = await supabase
    .from("shows")
    .select("previous_vote_count")
    .limit(1);

  if (testError) {
    console.error("\nError accessing previous_vote_count:", testError);
  } else {
    console.log("\n✓ previous_vote_count column is accessible");
  }
}

checkShows().catch(console.error);
