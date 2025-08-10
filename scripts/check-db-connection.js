#!/usr/bin/env node

/**
 * Database Connection & Table Verification Script
 * Checks database connection and verifies which tables exist
 */

const { drizzle } = require("drizzle-orm/postgres-js");
const postgres = require("postgres");
const { config } = require("dotenv");
const { resolve } = require("node:path");
const { existsSync } = require("node:fs");

// Load environment variables
const envPaths = [
  resolve(__dirname, "../.env.local"),
  resolve(__dirname, "../apps/web/.env.local"),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: false });
  }
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment variables");
  process.exit(1);
}

console.log("🔍 MySetlist Database Connection Check");
console.log("=====================================");

async function checkDatabaseConnection() {
  let sql;

  try {
    // Create connection with SSL configuration
    sql = postgres(DATABASE_URL, {
      ssl: "require",
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    console.log("✅ Database connection established");

    // Test basic query
    const result = await sql`SELECT version()`;
    console.log(
      "📊 PostgreSQL Version:",
      `${result[0].version.split(" ")[0]} ${result[0].version.split(" ")[1]}`,
    );

    return sql;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    throw error;
  }
}

async function checkTables(sql) {
  try {
    console.log("\n🔍 Checking existing tables...");

    // Get all tables in public schema
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    console.log(`📋 Found ${tables.length} tables:`);
    tables.forEach((table) => {
      console.log(`  - ${table.table_name}`);
    });

    // Check for specific tables we need
    const requiredTables = [
      "users",
      "artists",
      "venues",
      "shows",
      "setlists",
      "user_activity_log",
      "artist_stats",
      "trending_shows",
      "trending_artists",
    ];

    console.log("\n🎯 Checking required tables:");
    const existingTableNames = tables.map((t) => t.table_name);
    const missingTables = [];

    requiredTables.forEach((tableName) => {
      if (existingTableNames.includes(tableName)) {
        console.log(`  ✅ ${tableName}`);
      } else {
        console.log(`  ❌ ${tableName} - MISSING`);
        missingTables.push(tableName);
      }
    });

    if (missingTables.length > 0) {
      console.log(
        `\n⚠️  Missing ${missingTables.length} required tables:`,
        missingTables.join(", "),
      );
      return false;
    }
    console.log("\n✅ All required tables exist!");
    return true;
  } catch (error) {
    console.error("❌ Error checking tables:", error.message);
    throw error;
  }
}

async function checkTableContent(sql) {
  try {
    console.log("\n📊 Checking table row counts...");

    const tables = ["users", "artists", "venues", "shows", "setlists"];

    for (const tableName of tables) {
      try {
        const result =
          await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
        const count = Number.parseInt(result[0].count);
        console.log(`  ${tableName}: ${count} rows`);
      } catch (error) {
        console.log(`  ${tableName}: table doesn't exist`);
      }
    }
  } catch (error) {
    console.error("❌ Error checking table content:", error.message);
  }
}

async function main() {
  let sql;

  try {
    sql = await checkDatabaseConnection();
    const allTablesExist = await checkTables(sql);
    await checkTableContent(sql);

    if (!allTablesExist) {
      console.log("\n🔧 Next steps:");
      console.log("  1. Run: pnpm db:push (or use the fix-db-push.js script)");
      console.log("  2. Run: pnpm db:generate");
      console.log("  3. Run this script again to verify");
    }
  } catch (error) {
    console.error("\n💥 Script failed:", error.message);
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

main().catch(console.error);
