const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncSpecificArtist() {
  // Get first artist with spotify_id
  const { data: artists, error } = await supabase
    .from("artists")
    .select("id, name, spotify_id")
    .not("spotify_id", "is", null)
    .limit(1);

  if (error) {
    console.error("Error fetching artists:", error);
    return;
  }

  if (!artists || artists.length === 0) {
    console.log("No artists found with spotify_id");
    return;
  }

  const artist = artists[0];
  console.log(`Found artist: ${artist.name} (${artist.id})`);
  console.log(`Spotify ID: ${artist.spotify_id}`);

  // Now trigger sync for this specific artist
  console.log("\nTriggering sync for this artist...");

  const response = await fetch("http://localhost:3001/api/artists/sync-shows", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret":
        "20812ee7bcf7daf3f7309d03d5cb424cf78866f064ddc4fbf12a42508e5dbf8e",
    },
    body: JSON.stringify({
      artistId: artist.id,
    }),
  });

  const result = await response.json();
  console.log("Sync result:", result);
}

syncSpecificArtist().catch(console.error);
