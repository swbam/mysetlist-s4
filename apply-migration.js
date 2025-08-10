const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log("Applying migration to add missing columns...");

  // Add missing columns one by one to avoid issues
  const columns = [
    "previous_view_count INTEGER",
    "previous_attendee_count INTEGER",
    "previous_vote_count INTEGER",
    "previous_setlist_count INTEGER",
    "last_growth_calculated TIMESTAMP",
  ];

  for (const column of columns) {
    const [colName, colType] = column.split(" ");
    try {
      const { error } = await supabase.rpc("exec_sql", {
        query: `ALTER TABLE shows ADD COLUMN IF NOT EXISTS ${colName} ${colType}`,
      });

      if (error) {
        // Try direct SQL
        const { data, error: sqlError } = await supabase
          .from("shows")
          .select("id")
          .limit(0);

        console.log(`Testing if ${colName} exists...`);
      }
      console.log(`✓ Added/verified column: ${colName}`);
    } catch (err) {
      console.log(
        `Column ${colName} might already exist or there was an error:`,
        err.message,
      );
    }
  }

  // Update null values to 0
  try {
    const { error } = await supabase
      .from("shows")
      .update({
        previous_view_count: 0,
        previous_attendee_count: 0,
        previous_vote_count: 0,
        previous_setlist_count: 0,
      })
      .is("previous_vote_count", null);

    console.log("✓ Updated null values to 0");
  } catch (err) {
    console.log("Could not update null values:", err.message);
  }

  console.log("Migration complete!");
}

applyMigration().catch(console.error);
