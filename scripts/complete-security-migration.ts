#!/usr/bin/env tsx

/**
 * Complete Security Migration - Missing Steps
 * This script completes the remaining security migration steps
 */

import { config } from "dotenv";
import { join } from "path";

// Load environment variables first
config({ path: join(process.cwd(), ".env.local") });

import { db } from "@repo/database";
import { sql } from "drizzle-orm";

async function completeMigration() {
  console.log("🔒 Completing Security Migration (Missing Steps)...");
  console.log("");

  const steps = [
    {
      name: "Enable RLS on user_activity_log",
      sql: "ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY",
    },
    {
      name: "Create policy: Users can view their own activity logs",
      sql: `CREATE POLICY "Users can view their own activity logs"
            ON user_activity_log FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id)`,
    },
    {
      name: "Create policy: Service role can manage all activity logs",
      sql: `CREATE POLICY "Service role can manage all activity logs"
            ON user_activity_log FOR ALL
            TO service_role
            USING (true)`,
    },
    {
      name: "Create policy: Anyone can view trending artists",
      sql: `CREATE POLICY "Anyone can view trending artists"
            ON trending_artists FOR SELECT
            TO anon, authenticated
            USING (true)`,
    },
    {
      name: "Create policy: Anyone can view trending shows",
      sql: `CREATE POLICY "Anyone can view trending shows"
            ON trending_shows FOR SELECT
            TO anon, authenticated
            USING (true)`,
    },
    {
      name: "Create policy: Service role can manage pipeline jobs",
      sql: `CREATE POLICY "Service role can manage pipeline jobs"
            ON pipeline_jobs FOR ALL
            TO service_role
            USING (true)`,
    },
    {
      name: "Create policy: Service role can manage schema migrations",
      sql: `CREATE POLICY "Service role can manage schema migrations"
            ON schema_migrations FOR ALL
            TO service_role
            USING (true)`,
    },
    {
      name: "Drop existing cron_job_status view",
      sql: "DROP VIEW IF EXISTS cron_job_status",
    },
    {
      name: "Recreate cron_job_status view without SECURITY DEFINER",
      sql: `CREATE OR REPLACE VIEW cron_job_status AS
            SELECT
                j.jobid,
                j.jobname,
                j.schedule,
                j.active,
                j.command,
                (
                    SELECT jsonb_build_object(
                        'last_run', r.runid,
                        'started_at', r.job_start,
                        'finished_at', r.job_finish,
                        'status', r.status,
                        'return_message', r.return_message
                    )
                    FROM cron.job_run_details r
                    WHERE r.jobid = j.jobid
                    ORDER BY r.runid DESC
                    LIMIT 1
                ) as last_run,
                (
                    SELECT count(*)::int
                    FROM cron.job_run_details r
                    WHERE r.jobid = j.jobid
                    AND r.status = 'succeeded'
                ) as successful_runs,
                (
                    SELECT count(*)::int
                    FROM cron.job_run_details r
                    WHERE r.jobid = j.jobid
                    AND r.status = 'failed'
                ) as failed_runs
            FROM cron.job j
            WHERE j.username = current_user`,
    },
    {
      name: "Grant permissions on cron_job_status view",
      sql: "GRANT SELECT ON cron_job_status TO anon, authenticated, service_role",
    },
  ];

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const step of steps) {
    console.log(`🔄 ${step.name}...`);
    try {
      await db.execute(sql.raw(step.sql));
      console.log(`   ✅ Success`);
      successCount++;
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        console.log(`   ⚠️  Already exists (skipping)`);
        skipCount++;
      } else if (error.message?.includes("multiple primary keys")) {
        console.log(`   ⚠️  Primary key already exists (skipping)`);
        skipCount++;
      } else {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }
  }

  console.log("");
  console.log("📊 Summary:");
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ⚠️  Skipped: ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  if (errorCount === 0) {
    console.log("");
    console.log("🔍 Final Verification...");

    try {
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
          const status = row.security_status === "No SECURITY DEFINER" ? "✅" : "❌";
          console.log(`   ${row.viewname}: ${status} ${row.security_status}`);
        });
      }

      console.log("\n🎉 Security migration completed successfully!");
    } catch (error) {
      console.error("\n⚠️ Unable to verify final status:", error);
    }
  } else {
    console.log("\n⚠️ Some errors occurred. Please check the Supabase dashboard.");
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

// Execute the migration
completeMigration();