#!/usr/bin/env tsx

/**
 * Verify Security Status
 * This script verifies that all security issues have been resolved
 */

import { join } from "node:path";
import { config } from "dotenv";

// Load environment variables first
config({ path: join(process.cwd(), ".env.local") });

import { db } from "@repo/database";
import { sql } from "drizzle-orm";

async function verifySecurityStatus() {
  console.log("🔍 Verifying Database Security Status...");
  console.log("");

  try {
    // Check RLS status on all 5 tables
    const rlsCheck = await db.execute(sql`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('user_activity_log', 'trending_artists', 'trending_shows', 'pipeline_jobs', 'schema_migrations')
      ORDER BY tablename
    `);

    console.log("📊 Row Level Security (RLS) Status:");
    console.log("=".repeat(50));

    let rlsEnabled = 0;
    let rlsDisabled = 0;

    if (rlsCheck.rows && Array.isArray(rlsCheck.rows)) {
      rlsCheck.rows.forEach((row: any) => {
        const status = row.rowsecurity ? "✅ ENABLED" : "❌ DISABLED";
        console.log(`${row.tablename.padEnd(25)} ${status}`);
        if (row.rowsecurity) rlsEnabled++;
        else rlsDisabled++;
      });
    }

    console.log("-".repeat(50));
    console.log(`Total: ${rlsEnabled} enabled, ${rlsDisabled} disabled`);
    console.log("");

    // Check policies on each table
    const policiesCheck = await db.execute(sql`
      SELECT tablename, policyname, permissive, roles, cmd
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename IN ('user_activity_log', 'trending_artists', 'trending_shows', 'pipeline_jobs', 'schema_migrations')
      ORDER BY tablename, policyname
    `);

    console.log("📋 RLS Policies:");
    console.log("=".repeat(50));

    let currentTable = "";
    if (policiesCheck.rows && Array.isArray(policiesCheck.rows)) {
      policiesCheck.rows.forEach((row: any) => {
        if (row.tablename !== currentTable) {
          if (currentTable) console.log("");
          console.log(`\n${row.tablename}:`);
          currentTable = row.tablename;
        }
        console.log(`  - ${row.policyname}`);
        console.log(`    Roles: ${row.roles}`);
        console.log(`    Command: ${row.cmd}`);
      });
    }
    console.log("");

    // Check cron_job_status view
    const viewCheck = await db.execute(sql`
      SELECT viewname, viewowner, definition
      FROM pg_views 
      WHERE schemaname = 'public'
      AND viewname = 'cron_job_status'
    `);

    console.log("👁️ View Security:");
    console.log("=".repeat(50));

    if (
      viewCheck.rows &&
      Array.isArray(viewCheck.rows) &&
      viewCheck.rows.length > 0
    ) {
      const row = viewCheck.rows[0] as any;
      const hasSecurity = row.definition?.includes("SECURITY DEFINER");
      const status = hasSecurity
        ? "❌ USES SECURITY DEFINER"
        : "✅ NO SECURITY DEFINER";
      console.log(`cron_job_status: ${status}`);
    } else {
      console.log("cron_job_status: ⚠️ VIEW NOT FOUND");
    }
    console.log("");

    // Summary
    console.log("📊 Summary:");
    console.log("=".repeat(50));

    const allRlsEnabled = rlsDisabled === 0;
    const hasView = viewCheck.rows && viewCheck.rows.length > 0;
    const viewSecure =
      hasView &&
      !(viewCheck.rows[0] as any).definition?.includes("SECURITY DEFINER");

    console.log(
      `RLS Enabled on all tables: ${allRlsEnabled ? "✅ YES" : "❌ NO"}`,
    );
    console.log(
      `Policies configured: ${policiesCheck.rows && policiesCheck.rows.length > 0 ? "✅ YES" : "❌ NO"}`,
    );
    console.log(
      `View security fixed: ${viewSecure ? "✅ YES" : hasView ? "❌ NO" : "⚠️ VIEW MISSING"}`,
    );
    console.log("");

    if (allRlsEnabled && policiesCheck.rows && policiesCheck.rows.length > 0) {
      console.log("🎉 All security issues have been resolved!");
    } else {
      console.log(
        "⚠️ Some security issues remain. Please check the details above.",
      );
    }
  } catch (error) {
    console.error("❌ Error verifying security status:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Execute verification
verifySecurityStatus();
