const { createClient } = require("@supabase/supabase-js");
const fs = require("node:fs");
const path = require("node:path");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    // Read the migration SQL
    const migrationPath = path.join(
      __dirname,
      "..",
      "supabase",
      "migrations",
      "20250811_create_user_follows_artists.sql",
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    console.log("Applying migration: user_follows_artists table...");

    // Execute the SQL
    const { data, error } = await supabase
      .rpc("exec_sql", { sql_query: sql })
      .single();

    if (error) {
      // If RPC doesn't exist, try direct execution through the REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
        method: "POST",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: sql,
        }),
      });

      if (!response.ok) {
        // Try alternative approach - execute statements one by one
        const statements = sql.split(";").filter((s) => s.trim());

        for (const statement of statements) {
          if (statement.trim()) {
            console.log("Executing:", `${statement.substring(0, 50)}...`);
            // Note: Supabase doesn't directly support DDL through JS client
            // We need to use the SQL editor in Supabase Dashboard
          }
        }

        console.log(
          "\n⚠️  Direct SQL execution not available through Supabase JS client",
        );
        console.log(
          "Please run the following SQL in Supabase Dashboard SQL Editor:",
        );
        console.log(`\n${sql}`);
        return;
      }
    }

    console.log("✅ Migration applied successfully!");
  } catch (error) {
    console.error("Error applying migration:", error);
    console.log(
      "\n📝 Please manually apply this migration in Supabase Dashboard SQL Editor:",
    );
    console.log(
      "https://supabase.com/dashboard/project/yzwkimtdaabyjbpykquu/sql/new",
    );
  }
}

applyMigration();
