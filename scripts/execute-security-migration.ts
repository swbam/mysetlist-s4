#!/usr/bin/env tsx

/**
 * Execute Database Security Migration
 * This script directly executes the security migration SQL to fix RLS and view issues
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables
config({ path: join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Missing required environment variables:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL");
  console.error("   SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeMigration() {
  console.log("🔒 Executing Database Security Migration...");
  console.log("This will fix:");
  console.log("  - Enable RLS on 5 tables");
  console.log("  - Create appropriate RLS policies");
  console.log("  - Fix the security definer view issue");
  console.log("  - Set up proper service role permissions");
  console.log("");

  try {
    // Read the migration SQL file
    const migrationPath = join(
      process.cwd(),
      "supabase/migrations/20250128_security_fixes.sql",
    );
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    // Split the SQL into individual statements (simple split by semicolon)
    // Note: This is a simple approach that works for our migration
    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`📤 Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip DO blocks for now as they're just notices
      if (statement.startsWith("DO $$")) {
        console.log(`⏭️  Skipping notice block (statement ${i + 1})`);
        continue;
      }

      console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase
        .rpc("exec_sql", {
          sql: `${statement};`,
        })
        .single();

      if (error) {
        // Try direct execution if RPC doesn't exist
        console.log(
          "⚠️  RPC method not available, trying alternative approach...",
        );

        // For now, we'll need to use the Supabase SQL editor manually
        console.error(`❌ Unable to execute statement ${i + 1}:`);
        console.error(`${statement.substring(0, 100)}...`);
        console.error("");
        console.error(
          "Please execute the migration manually in the Supabase SQL Editor:",
        );
        console.error("1. Go to your Supabase dashboard");
        console.error("2. Navigate to SQL Editor");
        console.error("3. Copy and paste the contents of:");
        console.error("   supabase/migrations/20250128_security_fixes.sql");
        console.error("4. Execute the SQL");
        process.exit(1);
      }
    }

    console.log("");
    console.log("✅ Migration executed successfully!");
    console.log("");

    // Verify the changes
    console.log("🔍 Verifying security fixes...");

    // Check RLS status
    const { data: rlsStatus } = await supabase
      .rpc("exec_sql", {
        sql: `
          SELECT tablename, rowsecurity
          FROM pg_tables
          WHERE schemaname = 'public'
          AND tablename IN ('user_activity_log', 'trending_artists', 'trending_shows', 'pipeline_jobs', 'schema_migrations')
          ORDER BY tablename;
        `,
      })
      .single();

    if (rlsStatus) {
      console.log("✅ RLS Status:", rlsStatus);
    }
  } catch (error) {
    console.error("❌ Error executing migration:", error);
    process.exit(1);
  }
}

// Execute the migration
executeMigration();
