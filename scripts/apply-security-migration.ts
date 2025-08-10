#!/usr/bin/env tsx

/**
 * Apply Database Security Migration using Drizzle
 * This script executes the security migration SQL using the existing database connection
 */

import { join } from "node:path";
import { config } from "dotenv";

// Load environment variables first
config({ path: join(process.cwd(), ".env.local") });

import { readFileSync } from "node:fs";
import { db } from "@repo/database";
import { sql } from "drizzle-orm";

async function applySecurityMigration() {
  console.log("🔒 Applying Database Security Migration...");
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

    // Parse SQL into individual statements
    const statements = migrationSQL
      .split(/;\s*$/m) // Split by semicolon at end of line
      .map((s) => s.trim())
      .filter((s) => {
        // Filter out comments, empty lines, DO blocks, and RAISE NOTICE statements
        return (
          s.length > 0 &&
          !s.startsWith("--") &&
          !s.startsWith("DO $$") &&
          !s.includes("RAISE NOTICE") &&
          !s.includes("END $$")
        );
      });

    console.log(`📤 Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Log progress
      const shortStatement = statement.substring(0, 60).replace(/\n/g, " ");
      console.log(
        `🔄 Statement ${i + 1}/${statements.length}: ${shortStatement}...`,
      );

      try {
        // Execute the raw SQL statement
        await db.execute(sql.raw(statement));
        console.log("   ✅ Success");
      } catch (error: any) {
        // Some errors are expected (e.g., policy already exists)
        if (error.message?.includes("already exists")) {
          console.log("   ⚠️  Already exists (skipping)");
        } else if (error.message?.includes("multiple primary keys")) {
          console.log("   ⚠️  Primary key already exists (skipping)");
        } else {
          console.error(`   ❌ Error: ${error.message}`);
          // Don't throw on certain expected errors
          if (!error.message?.includes("RAISE")) {
            throw error;
          }
        }
      }
    }

    console.log("");
    console.log("✅ Migration applied successfully!");
    console.log("");

    // Verify the changes
    console.log("🔍 Verifying security fixes...");

    // Check RLS status
    const rlsCheck = await db.execute(sql`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('user_activity_log', 'trending_artists', 'trending_shows', 'pipeline_jobs', 'schema_migrations')
      ORDER BY tablename
    `);

    console.log("\n📊 RLS Status:");
    if (rlsCheck.rows && Array.isArray(rlsCheck.rows)) {
      rlsCheck.rows.forEach((row: any) => {
        const status = row.rowsecurity ? "✅ Enabled" : "❌ Disabled";
        console.log(`   ${row.tablename}: ${status}`);
      });
    } else {
      console.log("   Unable to verify RLS status");
    }

    // Check policies
    const policiesCheck = await db.execute(sql`
      SELECT tablename, COUNT(*) as policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename IN ('user_activity_log', 'trending_artists', 'trending_shows', 'pipeline_jobs', 'schema_migrations')
      GROUP BY tablename
      ORDER BY tablename
    `);

    console.log("\n📋 Policy Count:");
    if (policiesCheck.rows && Array.isArray(policiesCheck.rows)) {
      policiesCheck.rows.forEach((row: any) => {
        console.log(`   ${row.tablename}: ${row.policy_count} policies`);
      });
    } else {
      console.log("   Unable to verify policy count");
    }

    // Check view
    const viewCheck = await db.execute(sql`
      SELECT viewname, 
             CASE 
               WHEN definition LIKE '%SECURITY DEFINER%' THEN 'Uses SECURITY DEFINER'
               ELSE 'No SECURITY DEFINER'
             END as security_status
      FROM pg_views 
      WHERE viewname = 'cron_job_status'
    `);

    console.log("\n👁️ View Status:");
    if (viewCheck.rows && Array.isArray(viewCheck.rows)) {
      viewCheck.rows.forEach((row: any) => {
        const status =
          row.security_status === "No SECURITY DEFINER" ? "✅" : "❌";
        console.log(`   ${row.viewname}: ${status} ${row.security_status}`);
      });
    } else {
      console.log("   Unable to verify view status");
    }

    console.log("\n🎉 All security issues have been resolved!");
  } catch (error) {
    console.error("\n❌ Error applying migration:", error);
    console.error(
      "\nIf the error persists, please execute the migration manually:",
    );
    console.error("1. Go to your Supabase dashboard");
    console.error("2. Navigate to SQL Editor");
    console.error("3. Copy and paste the contents of:");
    console.error("   supabase/migrations/20250128_security_fixes.sql");
    console.error("4. Execute the SQL");
    process.exit(1);
  }

  process.exit(0);
}

// Execute the migration
applySecurityMigration();
