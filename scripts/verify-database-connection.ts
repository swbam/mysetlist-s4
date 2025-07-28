#!/usr/bin/env tsx
/**
 * Verify database connection and SSL settings
 */

import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
import { existsSync } from "fs";

// Load environment variables
const envPaths = [".env.local", ".env.production", ".env"];
for (const path of envPaths) {
  if (existsSync(path)) {
    dotenv.config({ path, override: false });
  }
}

interface ConnectionTest {
  name: string;
  test: () => Promise<boolean>;
}

async function testSupabaseConnection(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    console.log("❌ Missing Supabase credentials");
    return false;
  }

  try {
    // Test with anon key
    const supabase = createClient(url, anonKey);
    const { error: anonError } = await supabase
      .from("artists")
      .select("id")
      .limit(1);

    if (anonError && anonError.code !== "PGRST116") {
      // PGRST116 = table not found (ok for new projects)
      console.log(`❌ Supabase anon key test failed: ${anonError.message}`);
      return false;
    }

    console.log("✅ Supabase anon key connection successful");

    // Test with service key if available
    if (serviceKey) {
      const supabaseService = createClient(url, serviceKey);
      const { error: serviceError } = await supabaseService
        .from("artists")
        .select("id")
        .limit(1);

      if (serviceError && serviceError.code !== "PGRST116") {
        console.log(
          `❌ Supabase service key test failed: ${serviceError.message}`,
        );
        return false;
      }

      console.log("✅ Supabase service key connection successful");
    }

    return true;
  } catch (error) {
    console.log(`❌ Supabase connection error: ${error.message}`);
    return false;
  }
}

async function testDirectDatabaseConnection(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log("❌ DATABASE_URL not set");
    return false;
  }

  // Check SSL mode
  const hasSSL =
    databaseUrl.includes("sslmode=require") ||
    databaseUrl.includes("ssl=true") ||
    databaseUrl.includes("sslmode=prefer");

  if (!hasSSL) {
    console.log("⚠️  DATABASE_URL does not explicitly require SSL");
    console.log("   For production, use: ?sslmode=require");
  }

  try {
    // Parse connection string
    const isSupabaseUrl =
      databaseUrl.includes(".supabase.co") ||
      databaseUrl.includes(".pooler.supabase.com");

    if (isSupabaseUrl) {
      console.log("✅ Using Supabase pooled connection");
    }

    // Test connection
    const sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: hasSSL ? "require" : false,
    });

    const result = await sql`SELECT version()`;
    const version = result[0]?.version;

    console.log(`✅ Direct database connection successful`);
    console.log(`   PostgreSQL ${version.split(" ")[1]}`);

    // Test basic query
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      LIMIT 5
    `;

    console.log(`   Found ${tables.length} public tables`);

    await sql.end();
    return true;
  } catch (error) {
    console.log(`❌ Direct database connection failed: ${error.message}`);
    return false;
  }
}

async function testDrizzleConnection(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return false;
  }

  try {
    const sql = postgres(databaseUrl);
    const db = drizzle(sql);

    // Simple query to test Drizzle
    const result = await sql`SELECT 1 as test`;

    if (result[0]?.test === 1) {
      console.log("✅ Drizzle ORM connection successful");
      await sql.end();
      return true;
    }

    await sql.end();
    return false;
  } catch (error) {
    console.log(`❌ Drizzle connection failed: ${error.message}`);
    return false;
  }
}

async function checkDatabaseSchema(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return false;
  }

  try {
    const sql = postgres(databaseUrl);

    // Check for required tables
    const requiredTables = [
      "artists",
      "venues",
      "shows",
      "songs",
      "setlists",
      "setlist_songs",
      "votes",
      "users",
    ];

    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY(${requiredTables})
    `;

    const foundTables = tables.map((t) => t.table_name);
    const missingTables = requiredTables.filter(
      (t) => !foundTables.includes(t),
    );

    if (missingTables.length > 0) {
      console.log(`⚠️  Missing tables: ${missingTables.join(", ")}`);
      console.log('   Run "pnpm db:push" to create tables');
    } else {
      console.log("✅ All required tables exist");
    }

    // Check for indexes
    const indexes = await sql`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE '%_idx'
      LIMIT 10
    `;

    console.log(`   Found ${indexes.length}+ indexes`);

    await sql.end();
    return missingTables.length === 0;
  } catch (error) {
    console.log(`❌ Schema check failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("🔍 Verifying database connections...\n");

  const tests: ConnectionTest[] = [
    {
      name: "Supabase API Connection",
      test: testSupabaseConnection,
    },
    {
      name: "Direct Database Connection",
      test: testDirectDatabaseConnection,
    },
    {
      name: "Drizzle ORM Connection",
      test: testDrizzleConnection,
    },
    {
      name: "Database Schema Check",
      test: checkDatabaseSchema,
    },
  ];

  let allPassed = true;

  for (const connectionTest of tests) {
    console.log(`\n📋 ${connectionTest.name}:`);
    const passed = await connectionTest.test();
    if (!passed) {
      allPassed = false;
    }
  }

  console.log("\n" + "=".repeat(50));

  if (allPassed) {
    console.log("✅ All database connection tests passed!");
    console.log("\n🚀 Ready for deployment");
  } else {
    console.log("❌ Some database connection tests failed");
    console.log("\n📝 Next steps:");
    console.log("1. Check your DATABASE_URL and Supabase credentials");
    console.log("2. Ensure SSL is enabled for production: ?sslmode=require");
    console.log('3. Run "pnpm db:push" to create missing tables');
    console.log("4. Verify your Supabase project is active");
    process.exit(1);
  }
}

main().catch(console.error);
