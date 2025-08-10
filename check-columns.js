const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkColumns() {
  // Try to select all columns
  const { data: shows, error } = await supabase
    .from("shows")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error:", error);
    return;
  }

  if (shows && shows.length > 0) {
    console.log("Columns in shows table:");
    Object.keys(shows[0]).forEach((col) => {
      console.log(`  - ${col}: ${typeof shows[0][col]}`);
    });
  } else {
    console.log("No shows found in database");
  }
}

checkColumns().catch(console.error);
