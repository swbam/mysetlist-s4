import fs from "node:fs";
import path from "node:path";
import { env } from "@repo/env";
import { createClient } from "@supabase/supabase-js";

async function applyNewMigrations() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing required Supabase environment variables");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const migrations = [
    "0018_add_artist_songs_table.sql",
    "0019_add_mbid_to_artists.sql",
  ];

  for (const migrationFile of migrations) {
    const migrationPath = path.join(
      __dirname,
      "..",
      "migrations",
      migrationFile,
    );

    if (fs.existsSync(migrationPath)) {
      try {
        const sql = fs.readFileSync(migrationPath, "utf8");
        const { error } = await supabase.rpc("exec_sql", { sql });

        if (error) {
        } else {
        }
      } catch (_error) {}
    } else {
    }
  }
}

applyNewMigrations().catch(console.error);
