#!/usr/bin/env node

/**
 * End-to-End Test Script for MySetlist Sync and Trending System
 * Tests the complete flow: API sync → Database → Trending calculation → Frontend data
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
const CRON_SECRET = process.env.CRON_SECRET;
const NEXT_PUBLIC_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment variables");
  process.exit(1);
}

console.log("🧪 MySetlist End-to-End Test Suite");
console.log("=====================================");

async function testDatabaseConnection() {
  console.log("\n1️⃣ Testing Database Connection...");

  let sql;

  try {
    sql = postgres(DATABASE_URL, {
      ssl: "require",
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    const result = await sql`SELECT version()`;
    console.log(
      "✅ Database connected:",
      `${result[0].version.split(" ")[0]} ${result[0].version.split(" ")[1]}`,
    );

    return sql;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    throw error;
  }
}

async function testRequiredTables(sql) {
  console.log("\n2️⃣ Testing Required Tables...");

  const requiredTables = [
    "users",
    "artists",
    "venues",
    "shows",
    "setlists",
    "user_activity_log",
    "artist_stats",
    "trending_artists",
    "trending_shows",
  ];

  for (const tableName of requiredTables) {
    try {
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
        console.log(`  ❌ ${tableName} - MISSING!`);
        return false;
      }
    } catch (error) {
      console.log(`  ❌ ${tableName} - ERROR: ${error.message}`);
      return false;
    }
  }

  return true;
}

async function testAPIKeysConfiguration() {
  console.log("\n3️⃣ Testing API Keys Configuration...");

  const requiredKeys = {
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    TICKETMASTER_API_KEY: process.env.TICKETMASTER_API_KEY,
    SETLISTFM_API_KEY: process.env.SETLISTFM_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
  };

  let allConfigured = true;

  for (const [key, value] of Object.entries(requiredKeys)) {
    if (value) {
      console.log(`  ✅ ${key}: ${value.substring(0, 8)}...`);
    } else {
      console.log(`  ❌ ${key}: NOT CONFIGURED`);
      allConfigured = false;
    }
  }

  return allConfigured;
}

async function testAutonomousSyncEndpoint() {
  console.log("\n4️⃣ Testing Autonomous Sync Endpoint...");

  try {
    const response = await fetch(
      `${NEXT_PUBLIC_APP_URL}/api/cron/autonomous-sync?mode=discovery&limit=5`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    console.log("✅ Autonomous sync endpoint working");
    console.log("  📊 Discovery mode results:");
    console.log(
      `    - Ticketmaster: ${result.discovery.ticketmaster.found} found, ${result.discovery.ticketmaster.added} added`,
    );
    console.log(
      `    - Spotify: ${result.discovery.spotify.found} found, ${result.discovery.spotify.added} added`,
    );
    console.log(`  ⏱️  Duration: ${result.duration}`);

    return result;
  } catch (error) {
    console.error("❌ Autonomous sync failed:", error.message);
    return null;
  }
}

async function testTrendingCalculationEndpoint() {
  console.log("\n5️⃣ Testing Trending Calculation Endpoint...");

  try {
    const response = await fetch(
      `${NEXT_PUBLIC_APP_URL}/api/cron/calculate-trending?mode=daily&type=all`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    console.log("✅ Trending calculation endpoint working");
    console.log("  📊 Results:");
    console.log(`    - Artists updated: ${result.results.artists.updated}`);
    console.log(`    - Shows updated: ${result.results.shows.updated}`);
    if (result.results.trending) {
      console.log(
        `    - Top trending artist: ${result.results.trending.topArtist}`,
      );
      console.log(
        `    - Top trending show: ${result.results.trending.topShow}`,
      );
    }

    return result;
  } catch (error) {
    console.error("❌ Trending calculation failed:", error.message);
    return null;
  }
}

async function testDatabaseDataAfterSync(sql) {
  console.log("\n6️⃣ Testing Database Data After Sync...");

  try {
    // Check artists table
    const artistsResult = await sql`SELECT COUNT(*) as count FROM artists`;
    const artistsCount = Number.parseInt(artistsResult[0].count);
    console.log(`  👤 Artists in database: ${artistsCount}`);

    // Check shows table
    const showsResult = await sql`SELECT COUNT(*) as count FROM shows`;
    const showsCount = Number.parseInt(showsResult[0].count);
    console.log(`  🎵 Shows in database: ${showsCount}`);

    // Check venues table
    const venuesResult = await sql`SELECT COUNT(*) as count FROM venues`;
    const venuesCount = Number.parseInt(venuesResult[0].count);
    console.log(`  🏛️  Venues in database: ${venuesCount}`);

    // Check trending scores
    const trendingArtistsResult = await sql`
      SELECT COUNT(*) as count FROM artists WHERE trending_score > 0
    `;
    const trendingArtistsCount = Number.parseInt(
      trendingArtistsResult[0].count,
    );
    console.log(`  📈 Artists with trending scores: ${trendingArtistsCount}`);

    const trendingShowsResult = await sql`
      SELECT COUNT(*) as count FROM shows WHERE trending_score > 0
    `;
    const trendingShowsCount = Number.parseInt(trendingShowsResult[0].count);
    console.log(`  🎭 Shows with trending scores: ${trendingShowsCount}`);

    // Check user activity log
    const activityResult =
      await sql`SELECT COUNT(*) as count FROM user_activity_log`;
    const activityCount = Number.parseInt(activityResult[0].count);
    console.log(`  📝 Activity log entries: ${activityCount}`);

    return {
      artists: artistsCount,
      shows: showsCount,
      venues: venuesCount,
      trendingArtists: trendingArtistsCount,
      trendingShows: trendingShowsCount,
      activities: activityCount,
    };
  } catch (error) {
    console.error("❌ Error checking database data:", error.message);
    return null;
  }
}

async function testTrendingAPIEndpoints() {
  console.log("\n7️⃣ Testing Trending API Endpoints...");

  try {
    // Test trending artists endpoint
    const artistsResponse = await fetch(
      `${NEXT_PUBLIC_APP_URL}/api/trending/artists`,
    );
    if (artistsResponse.ok) {
      const artistsData = await artistsResponse.json();
      console.log(
        `  ✅ /api/trending/artists: ${artistsData.length} artists returned`,
      );
    } else {
      console.log(`  ❌ /api/trending/artists: HTTP ${artistsResponse.status}`);
    }

    // Test trending shows endpoint
    const showsResponse = await fetch(
      `${NEXT_PUBLIC_APP_URL}/api/trending/shows`,
    );
    if (showsResponse.ok) {
      const showsData = await showsResponse.json();
      console.log(
        `  ✅ /api/trending/shows: ${showsData.length} shows returned`,
      );
    } else {
      console.log(`  ❌ /api/trending/shows: HTTP ${showsResponse.status}`);
    }

    // Test main trending endpoint
    const mainResponse = await fetch(`${NEXT_PUBLIC_APP_URL}/api/trending`);
    if (mainResponse.ok) {
      const mainData = await mainResponse.json();
      console.log(
        `  ✅ /api/trending: ${mainData.artists?.length || 0} artists, ${mainData.shows?.length || 0} shows`,
      );
    } else {
      console.log(`  ❌ /api/trending: HTTP ${mainResponse.status}`);
    }

    return true;
  } catch (error) {
    console.error("❌ Error testing trending endpoints:", error.message);
    return false;
  }
}

async function testSpotifyAPIConnection() {
  console.log("\n8️⃣ Testing Spotify API Connection...");

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Spotify API connection successful");
      console.log(`  🔑 Token obtained (expires in ${data.expires_in}s)`);
      return true;
    }
    console.log(`❌ Spotify API failed: HTTP ${response.status}`);
    return false;
  } catch (error) {
    console.error("❌ Spotify API error:", error.message);
    return false;
  }
}

async function testTicketmasterAPIConnection() {
  console.log("\n9️⃣ Testing Ticketmaster API Connection...");

  try {
    const url = new URL(
      "https://app.ticketmaster.com/discovery/v2/events.json",
    );
    url.searchParams.append("apikey", process.env.TICKETMASTER_API_KEY);
    url.searchParams.append("classificationName", "Music");
    url.searchParams.append("city", "Los Angeles");
    url.searchParams.append("size", "1");

    const response = await fetch(url.toString());

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Ticketmaster API connection successful");
      console.log(
        `  🎫 Found ${data._embedded?.events?.length || 0} events in test query`,
      );
      return true;
    }
    console.log(`❌ Ticketmaster API failed: HTTP ${response.status}`);
    return false;
  } catch (error) {
    console.error("❌ Ticketmaster API error:", error.message);
    return false;
  }
}

async function generateSummaryReport(results) {
  console.log("\n📊 SUMMARY REPORT");
  console.log("==================");

  let totalTests = 0;
  let passedTests = 0;

  // Count results
  const testResults = {
    "Database Connection": results.database ? 1 : 0,
    "Required Tables": results.tables ? 1 : 0,
    "API Keys Configuration": results.apiKeys ? 1 : 0,
    "Autonomous Sync": results.autonomousSync ? 1 : 0,
    "Trending Calculation": results.trendingCalc ? 1 : 0,
    "Database Data": results.databaseData ? 1 : 0,
    "Trending Endpoints": results.trendingEndpoints ? 1 : 0,
    "Spotify API": results.spotifyAPI ? 1 : 0,
    "Ticketmaster API": results.ticketmasterAPI ? 1 : 0,
  };

  for (const [testName, passed] of Object.entries(testResults)) {
    totalTests++;
    if (passed) {
      passedTests++;
      console.log(`✅ ${testName}`);
    } else {
      console.log(`❌ ${testName}`);
    }
  }

  console.log(`\n🎯 Overall Score: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log("🎉 ALL TESTS PASSED! The system is working correctly.");
    console.log(
      "✨ The trending page should now show real data from the APIs.",
    );
  } else {
    console.log(
      `⚠️  ${totalTests - passedTests} tests failed. Please review the errors above.`,
    );
  }

  if (results.databaseData) {
    console.log("\n📈 Database Statistics:");
    console.log(`  - ${results.databaseData.artists} artists`);
    console.log(`  - ${results.databaseData.shows} shows`);
    console.log(`  - ${results.databaseData.venues} venues`);
    console.log(
      `  - ${results.databaseData.trendingArtists} artists with trending scores`,
    );
    console.log(
      `  - ${results.databaseData.trendingShows} shows with trending scores`,
    );
    console.log(`  - ${results.databaseData.activities} activity log entries`);
  }
}

async function main() {
  let sql;
  const results = {};

  try {
    // Run all tests
    sql = await testDatabaseConnection();
    results.database = true;

    results.tables = await testRequiredTables(sql);
    results.apiKeys = await testAPIKeysConfiguration();
    results.spotifyAPI = await testSpotifyAPIConnection();
    results.ticketmasterAPI = await testTicketmasterAPIConnection();

    // Only run sync tests if basic setup is working
    if (results.tables && results.apiKeys) {
      results.autonomousSync = !!(await testAutonomousSyncEndpoint());
      results.trendingCalc = !!(await testTrendingCalculationEndpoint());
      results.databaseData = await testDatabaseDataAfterSync(sql);
      results.trendingEndpoints = await testTrendingAPIEndpoints();
    }

    await generateSummaryReport(results);
  } catch (error) {
    console.error("\n💥 Test suite failed:", error.message);
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

main().catch(console.error);
