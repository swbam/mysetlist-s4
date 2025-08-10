#!/usr/bin/env tsx

/**
 * Check Database Structure
 * This script checks the current database structure
 */

import { join } from "node:path";
import { config } from "dotenv";

// Load environment variables first
config({ path: join(process.cwd(), ".env.local") });

import { db } from "@repo/database";
import { sql } from "drizzle-orm";

async function checkDatabaseStructure() {
  console.log("🔍 Checking Database Structure...");
  console.log("");

  try {
    // List all tables
    const tables = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log("📊 Public Tables:");
    if (tables.rows && Array.isArray(tables.rows)) {
      tables.rows.forEach((row: any) => {
        console.log(`  - ${row.tablename}`);
      });
    }
    console.log(`Total: ${tables.rows?.length || 0} tables`);
    console.log("");

    // Check if our target tables exist
    const targetTables = [
      "user_activity_log",
      "trending_artists",
      "trending_shows",
      "pipeline_jobs",
      "schema_migrations",
    ];
    console.log("🎯 Target Tables Status:");

    for (const tableName of targetTables) {
      const exists = tables.rows?.some(
        (row: any) => row.tablename === tableName,
      );
      console.log(`  ${tableName}: ${exists ? "✅ EXISTS" : "❌ NOT FOUND"}`);
    }

    // Check cron schema
    console.log("\n📅 Cron Schema:");
    const cronTables = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'cron'
      ORDER BY tablename
    `);

    if (cronTables.rows && Array.isArray(cronTables.rows)) {
      cronTables.rows.forEach((row: any) => {
        console.log(`  - cron.${row.tablename}`);
      });
    }

    // Check cron columns
    console.log("\n📋 Cron Job Run Details Columns:");
    const cronColumns = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'cron'
      AND table_name = 'job_run_details'
      ORDER BY ordinal_position
    `);

    if (cronColumns.rows && Array.isArray(cronColumns.rows)) {
      cronColumns.rows.forEach((row: any) => {
        console.log(`  - ${row.column_name} (${row.data_type})`);
      });
    }
  } catch (error) {
    console.error("❌ Error checking database structure:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Execute check
checkDatabaseStructure();
