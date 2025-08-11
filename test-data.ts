import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yzwkimtdaabyjbpykquu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY5MjMxNiwiZXhwIjoyMDY2MjY4MzE2fQ.ZMorLC_eZke3bvBAF0zyzqUONxpomfTN2RpE_mLjz18";

const supabase = createClient(supabaseUrl.trim(), supabaseKey.trim());

async function checkData() {
  console.log("Checking for real data in Supabase...\n");

  // Check artists
  const { data: artists, error: artistsError } = await supabase
    .from("artists")
    .select("id, name, slug, popularity, trending_score")
    .limit(5)
    .order("trending_score", { ascending: false });

  if (artistsError) {
    console.error("Artists error:", artistsError);
  } else {
    console.log(`Found ${artists?.length || 0} artists`);
    if (artists && artists.length > 0) {
      console.log("Sample artists:", artists.map(a => a.name).join(", "));
    }
  }

  // Check shows
  const { data: shows, error: showsError } = await supabase
    .from("shows")
    .select("id, name, slug, date, vote_count")
    .gte("date", new Date().toISOString().split("T")[0])
    .limit(5)
    .order("vote_count", { ascending: false });

  if (showsError) {
    console.error("Shows error:", showsError);
  } else {
    console.log(`\nFound ${shows?.length || 0} upcoming shows`);
    if (shows && shows.length > 0) {
      console.log("Sample shows:", shows.map(s => s.name).join(", "));
    }
  }

  // Check setlists
  const { data: setlists, error: setlistsError } = await supabase
    .from("setlists")
    .select("id, name, type")
    .limit(5);

  if (setlistsError) {
    console.error("Setlists error:", setlistsError);
  } else {
    console.log(`\nFound ${setlists?.length || 0} setlists`);
  }

  // Check votes
  const { data: votes, count } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true });

  console.log(`\nTotal votes in database: ${count || 0}`);

  // Check songs
  const { data: songs, count: songCount } = await supabase
    .from("songs")
    .select("*", { count: "exact", head: true });

  console.log(`Total songs in database: ${songCount || 0}`);

  process.exit(0);
}

checkData();