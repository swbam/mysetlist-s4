#!/usr/bin/env tsx
/**
 * Test script to verify database security fixes
 * Run this after deploying the security migration
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create different client types for testing
const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<void>,
): Promise<void> {
  try {
    await testFn();
    results.push({ test: name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({ test: name, passed: false, error: String(error) });
    console.log(`❌ ${name}: ${error}`);
  }
}

async function testRLSEnabled(): Promise<void> {
  console.log("\n🔒 Testing RLS is enabled on all tables...\n");

  const { data, error } = await serviceClient
    .from("pg_tables")
    .select("tablename, rowsecurity")
    .eq("schemaname", "public")
    .in("tablename", [
      "user_activity_log",
      "trending_artists",
      "trending_shows",
      "pipeline_jobs",
      "schema_migrations",
    ]);

  if (error) throw error;

  for (const table of data || []) {
    await runTest(`RLS enabled on ${table.tablename}`, async () => {
      if (!table.rowsecurity) {
        throw new Error("RLS not enabled");
      }
    });
  }
}

async function testTrendingDataAccess(): Promise<void> {
  console.log("\n📊 Testing public access to trending data...\n");

  // Test anonymous access to trending artists
  await runTest("Anonymous can read trending_artists", async () => {
    const { error } = await anonClient
      .from("trending_artists")
      .select("*")
      .limit(1);
    if (error) throw error;
  });

  // Test anonymous access to trending shows
  await runTest("Anonymous can read trending_shows", async () => {
    const { error } = await anonClient
      .from("trending_shows")
      .select("*")
      .limit(1);
    if (error) throw error;
  });

  // Test anonymous cannot write to trending tables
  await runTest("Anonymous cannot write to trending_artists", async () => {
    const { error } = await anonClient
      .from("trending_artists")
      .insert({ artist_id: "test-id", name: "Test Artist" });
    if (!error) throw new Error("Write should have failed");
  });
}

async function testServiceRoleAccess(): Promise<void> {
  console.log("\n🔑 Testing service role access...\n");

  // Test service role can manage all protected tables
  const tables = [
    "user_activity_log",
    "trending_artists",
    "trending_shows",
    "pipeline_jobs",
    "schema_migrations",
  ];

  for (const table of tables) {
    await runTest(`Service role can read ${table}`, async () => {
      const { error } = await serviceClient.from(table).select("*").limit(1);
      if (error) throw error;
    });
  }
}

async function testUserActivityLogPolicies(): Promise<void> {
  console.log("\n👤 Testing user activity log policies...\n");

  // Create a test authenticated client
  const {
    data: { user },
    error: signUpError,
  } = await anonClient.auth.signUp({
    email: `test-${Date.now()}@example.com`,
    password: "testpassword123",
  });

  if (signUpError || !user) {
    console.log(
      "⚠️  Skipping user activity log tests (cannot create test user)",
    );
    return;
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });

  // Sign in as the test user
  await authClient.auth.signInWithPassword({
    email: user.email!,
    password: "testpassword123",
  });

  await runTest("User can view their own activity logs", async () => {
    const { error } = await authClient
      .from("user_activity_log")
      .select("*")
      .eq("user_id", user.id)
      .limit(1);
    if (error) throw error;
  });

  await runTest("User cannot view other users activity logs", async () => {
    const { data, error } = await authClient
      .from("user_activity_log")
      .select("*")
      .neq("user_id", user.id)
      .limit(1);

    // Should return empty data due to RLS
    if (error) throw error;
    if (data && data.length > 0)
      throw new Error("Should not see other users logs");
  });
}

async function testCronJobStatusView(): Promise<void> {
  console.log("\n⏰ Testing cron job status view...\n");

  await runTest("Service role can read cron_job_status view", async () => {
    const { error } = await serviceClient
      .from("cron_job_status")
      .select("*")
      .limit(1);
    if (error) throw error;
  });

  // Check view definition doesn't contain SECURITY DEFINER
  await runTest("cron_job_status view is not security definer", async () => {
    const { data, error } = await serviceClient
      .from("pg_views")
      .select("definition")
      .eq("viewname", "cron_job_status")
      .single();

    if (error) throw error;
    if (data?.definition?.includes("SECURITY DEFINER")) {
      throw new Error("View still uses SECURITY DEFINER");
    }
  });
}

async function main() {
  console.log("🧪 Testing Database Security Fixes...\n");
  console.log(`Using Supabase URL: ${supabaseUrl}`);
  console.log("");

  await testRLSEnabled();
  await testTrendingDataAccess();
  await testServiceRoleAccess();
  await testUserActivityLogPolicies();
  await testCronJobStatusView();

  console.log("\n📊 Test Results Summary:\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);

  if (failed > 0) {
    console.log("\n❌ Failed Tests:\n");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.test}: ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log("\n✅ All security tests passed!");
    console.log("🔒 Your database is now properly secured.");
  }
}

main().catch(console.error);
