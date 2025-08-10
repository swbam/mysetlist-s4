#!/usr/bin/env node

/**
 * Database Schema Push Script
 * Alternative to pnpm db:push that handles SSL certificate issues
 */

const { drizzle } = require("drizzle-orm/postgres-js");
const { migrate } = require("drizzle-orm/postgres-js/migrator");
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

console.log("🔧 MySetlist Database Schema Push");
console.log("==================================");

async function createMissingTables() {
  let sql;

  try {
    // Create connection with proper SSL handling
    sql = postgres(DATABASE_URL, {
      ssl: "require",
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    console.log("✅ Database connection established");

    // Create user_activity_log table if it doesn't exist
    console.log("🔧 Creating user_activity_log table...");
    await sql`
      CREATE TABLE IF NOT EXISTS user_activity_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id UUID,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    // Create trending_artists table if it doesn't exist
    console.log("🔧 Creating trending_artists table...");
    await sql`
      CREATE TABLE IF NOT EXISTS trending_artists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        artist_id UUID REFERENCES artists(id) NOT NULL,
        score FLOAT DEFAULT 0,
        votes_count INTEGER DEFAULT 0,
        shows_count INTEGER DEFAULT 0,
        followers_count INTEGER DEFAULT 0,
        momentum_score FLOAT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(artist_id)
      )
    `;

    // Create trending_shows table if it doesn't exist
    console.log("🔧 Creating trending_shows table...");
    await sql`
      CREATE TABLE IF NOT EXISTS trending_shows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        show_id UUID REFERENCES shows(id) NOT NULL,
        score FLOAT DEFAULT 0,
        votes_count INTEGER DEFAULT 0,
        setlist_count INTEGER DEFAULT 0,
        engagement_score FLOAT DEFAULT 0,
        recency_score FLOAT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(show_id)
      )
    `;

    // Create indexes for better performance
    console.log("🔧 Creating indexes...");
    await sql`CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_trending_artists_score ON trending_artists(score DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_trending_shows_score ON trending_shows(score DESC)`;

    console.log("✅ All missing tables and indexes created successfully!");

    return sql;
  } catch (error) {
    console.error("❌ Error creating tables:", error.message);
    throw error;
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

async function verifyTables() {
  let sql;

  try {
    sql = postgres(DATABASE_URL, {
      ssl: "require",
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    console.log("\n🔍 Verifying tables were created...");

    const requiredTables = [
      "user_activity_log",
      "trending_artists",
      "trending_shows",
    ];

    for (const tableName of requiredTables) {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        )
      `;

      if (result[0].exists) {
        console.log(`  ✅ ${tableName}`);
      } else {
        console.log(`  ❌ ${tableName} - still missing!`);
      }
    }
  } catch (error) {
    console.error("❌ Error verifying tables:", error.message);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

async function main() {
  try {
    await createMissingTables();
    await verifyTables();

    console.log("\n🎉 Database schema update completed!");
    console.log("Next steps:");
    console.log("  1. Run: node scripts/check-db-connection.js");
    console.log("  2. Run: pnpm seed:comprehensive");
    console.log("  3. Test the application");
  } catch (error) {
    console.error("\n💥 Script failed:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);
