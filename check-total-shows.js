const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTotalShows() {
  // Try to update total_shows
  const { data, error } = await supabase
    .from("artists")
    .update({ total_shows: 0 })
    .eq("id", "3e1519d3-9ad3-4e27-8844-5112ffd803e0")
    .select();

  if (error) {
    console.error("Error updating total_shows:", error);
  } else {
    console.log("Successfully updated total_shows");
    console.log("Data:", data);
  }
}

checkTotalShows().catch(console.error);
