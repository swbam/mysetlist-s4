#!/usr/bin/env tsx

/**
 * Comprehensive test script for the TheSet sync system
 * Tests artist import, cron job triggering, and data creation
 */

import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !CRON_SECRET) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test utilities
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function logResult(testName: string, success: boolean, details?: any) {
  const status = success ? "✅ PASS" : "❌ FAIL";
  console.log(`${status} ${testName}`);
  if (details) {
    console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
  console.log("");
}

/**
 * Test 1: Verify environment variables are properly configured
 */
async function testEnvironmentVariables() {
  console.log("🔧 Testing Environment Variables...");

  const requiredVars = {
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    CRON_SECRET,
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    TICKETMASTER_API_KEY: process.env.TICKETMASTER_API_KEY,
    SETLISTFM_API_KEY: process.env.SETLISTFM_API_KEY,
  };

  let allPresent = true;
  const missing = [];

  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      allPresent = false;
      missing.push(key);
    }
  }

  await logResult("Environment Variables Check", allPresent, { missing });
  return allPresent;
}

/**
 * Test 2: Test artist import functionality
 */
async function testArtistImport() {
  console.log("🎵 Testing Artist Import...");

  // Test with a well-known artist (Arctic Monkeys on Ticketmaster)
  const testArtistId = "K8vZ917Ga97"; // Arctic Monkeys

  try {
    const response = await fetch(`${APP_URL}/api/artists/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tmAttractionId: testArtistId }),
    });

    const result = await response.json();
    const success = response.ok && (result.artistId || result.slug);

    await logResult("Artist Import API", success, result);

    if (success && result.artistId) {
      // Wait a bit for background processes
      await delay(2000);

      // Verify the artist was created in the database
      const { data: artist, error } = await supabase
        .from("artists")
        .select("*")
        .eq("id", result.artistId)
        .single();

      const dbSuccess = !error && artist;
      await logResult("Artist Database Creation", dbSuccess, {
        artist: artist?.name,
      });

      return { success: dbSuccess, artistId: result.artistId };
    }

    return { success: false };
  } catch (error) {
    await logResult("Artist Import API", false, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { success: false };
  }
}

/**
 * Test 3: Test manual cron job triggering
 */
async function testCronJobTriggering() {
  console.log("⏰ Testing Cron Job Triggering...");

  const cronEndpoints = [
    "/api/cron/master-sync",
    "/api/cron/sync-artist-data",
    "/api/cron/calculate-trending",
    "/api/cron/finish-mysetlist-sync",
  ];

  const results: Record<string, boolean> = {};

  for (const endpoint of cronEndpoints) {
    try {
      console.log(`   Testing ${endpoint}...`);

      const response = await fetch(`${APP_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CRON_SECRET}`,
        },
        body: JSON.stringify({ mode: "manual", limit: 5 }),
      });

      const result = await response.json();
      const success = response.ok && result.success !== false;

      results[endpoint] = success;
      await logResult(`Cron Job ${endpoint}`, success, result);

      // Add delay between cron job tests
      await delay(1000);
    } catch (error) {
      results[endpoint] = false;
      await logResult(`Cron Job ${endpoint}`, false, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const allSuccessful = Object.values(results).every(Boolean);
  return { success: allSuccessful, results };
}

/**
 * Test 4: Test orchestrated sync functionality
 */
async function testOrchestratedSync() {
  console.log("🎭 Testing Orchestrated Sync...");

  try {
    const response = await fetch(`${APP_URL}/api/cron/finish-mysetlist-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CRON_SECRET}`,
      },
      body: JSON.stringify({
        mode: "daily",
        orchestrate: true,
      }),
    });

    const result = await response.json();
    const success = response.ok && result.success !== false;

    await logResult("Orchestrated Sync", success, {
      orchestrationResult: result.result?.orchestrationResult,
      processed: result.result?.processed,
      created: result.result?.created,
      errors: result.result?.errors,
    });

    return { success };
  } catch (error) {
    await logResult("Orchestrated Sync", false, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { success: false };
  }
}

/**
 * Test 5: Verify database data creation
 */
async function testDatabaseDataCreation() {
  console.log("🗄️ Testing Database Data Creation...");

  const tables = ["artists", "shows", "setlists", "songs", "venues"];
  const results: Record<string, any> = {};

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (!error) {
        results[table] = { count, hasData: (count || 0) > 0 };
      } else {
        results[table] = { error: error.message };
      }
    } catch (error) {
      results[table] = {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  const hasData = Object.values(results).some((result: any) => result.hasData);
  await logResult("Database Data Creation", hasData, results);

  return { success: hasData, results };
}

/**
 * Test 6: Test cron job logs
 */
async function testCronJobLogs() {
  console.log("📝 Testing Cron Job Logs...");

  try {
    const { data: logs, error } = await supabase
      .from("cron_job_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && logs) {
      const recentLogs = logs.filter((log) => {
        const logTime = new Date(log.created_at);
        const now = new Date();
        return now.getTime() - logTime.getTime() < 24 * 60 * 60 * 1000; // Last 24 hours
      });

      await logResult("Cron Job Logs", recentLogs.length > 0, {
        totalLogs: logs.length,
        recentLogs: recentLogs.length,
        lastJob: logs[0]?.job_name,
        lastStatus: logs[0]?.status,
      });

      return { success: recentLogs.length > 0 };
    }
    await logResult("Cron Job Logs", false, { error: error?.message });
    return { success: false };
  } catch (error) {
    await logResult("Cron Job Logs", false, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { success: false };
  }
}

/**
 * Test 7: Test sync functions from lib/sync-functions.ts
 */
async function testSyncFunctions() {
  console.log("🔧 Testing Sync Functions...");

  try {
    // Test basic sync function API calls
    const { triggerManualSync, triggerTrendingUpdate } = await import(
      "../apps/web/lib/sync-functions"
    );

    console.log("   Testing triggerTrendingUpdate...");
    const trendingResult = await triggerTrendingUpdate();
    const trendingSuccess = trendingResult && !trendingResult.error;

    await logResult(
      "Sync Functions - Trending Update",
      trendingSuccess,
      trendingResult,
    );

    return { success: trendingSuccess };
  } catch (error) {
    await logResult("Sync Functions", false, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { success: false };
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log("🚀 Starting TheSet Sync System Tests\n");
  console.log("=".repeat(50));

  const testResults: Record<string, boolean> = {};

  // Run all tests
  testResults.env = await testEnvironmentVariables();
  testResults.artistImport = (await testArtistImport()).success;
  testResults.cronJobs = (await testCronJobTriggering()).success;
  testResults.orchestratedSync = (await testOrchestratedSync()).success;
  testResults.databaseData = (await testDatabaseDataCreation()).success;
  testResults.cronLogs = (await testCronJobLogs()).success;
  testResults.syncFunctions = (await testSyncFunctions()).success;

  // Summary
  console.log("=".repeat(50));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(50));

  const passed = Object.values(testResults).filter(Boolean).length;
  const total = Object.keys(testResults).length;

  for (const [testName, success] of Object.entries(testResults)) {
    const status = success ? "✅" : "❌";
    console.log(`${status} ${testName}`);
  }

  console.log("");
  console.log(`🎯 Overall: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log("🎉 All tests passed! The sync system is working correctly.");
  } else {
    console.log("⚠️  Some tests failed. Please check the issues above.");
  }

  process.exit(passed === total ? 0 : 1);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error("❌ Test runner failed:", error);
    process.exit(1);
  });
}

export { runAllTests };
