#!/usr/bin/env node

/**
 * Vercel Environment Variables Verification Script
 * Run this to ensure all required environment variables are properly configured
 */

const requiredEnvVars = [
  // Database
  "DATABASE_URL",

  // Supabase
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_JWT_SECRET",

  // External APIs
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "NEXT_PUBLIC_SPOTIFY_CLIENT_ID",
  "TICKETMASTER_API_KEY",
  "SETLISTFM_API_KEY",
  "SETLIST_FM_API_KEY",

  // Security
  "CRON_SECRET",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",

  // URLs
  "NEXT_PUBLIC_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_WEB_URL",
  "NEXT_PUBLIC_API_URL",
];

const optionalEnvVars = [
  "DIRECT_URL",
  "NODE_ENV",
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_VERCEL_ANALYTICS",
  "NEXT_PUBLIC_ENABLE_SPOTIFY",
  "NEXT_PUBLIC_ENABLE_REALTIME",
  "NEXT_PUBLIC_ENABLE_ANALYTICS",
  "NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS",
  "NEXT_PUBLIC_ENABLE_ADVANCED_SEARCH",
  "NEXT_PUBLIC_ENABLE_USER_GENERATED_CONTENT",
  "NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING",
];

console.log("🔍 MySetlist - Vercel Environment Variables Verification\n");
console.log("=".repeat(60));

let hasErrors = false;
const missingVars = [];

// Check required variables
console.log("\n✅ Required Variables:");
console.log("-".repeat(60));

requiredEnvVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    const displayValue =
      varName.includes("SECRET") || varName.includes("KEY")
        ? value.substring(0, 10) + "..."
        : value.substring(0, 30) + (value.length > 30 ? "..." : "");
    console.log(`  ✓ ${varName.padEnd(35)} = ${displayValue}`);
  } else {
    console.log(`  ✗ ${varName.padEnd(35)} = MISSING ❌`);
    hasErrors = true;
    missingVars.push(varName);
  }
});

console.log("\n📋 Optional Variables:");
console.log("-".repeat(60));

optionalEnvVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✓ ${varName.padEnd(35)} = ${value}`);
  } else {
    console.log(`  - ${varName.padEnd(35)} = not set`);
  }
});

// Test API connections
console.log("\n🔌 Testing API Connections:");
console.log("-".repeat(60));

async function testSupabase() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.log("  ⚠️  Supabase: Skipping test (missing credentials)");
    return;
  }

  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/",
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      },
    );
    if (response.ok) {
      console.log("  ✓ Supabase connection successful");
    } else {
      console.log(
        `  ✗ Supabase connection failed: ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    console.log(`  ✗ Supabase connection error: ${error.message}`);
  }
}

async function testSpotify() {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.log("  ⚠️  Spotify: Skipping test (missing credentials)");
    return;
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.SPOTIFY_CLIENT_ID +
              ":" +
              process.env.SPOTIFY_CLIENT_SECRET,
          ).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    if (response.ok) {
      const data = await response.json();
      console.log("  ✓ Spotify API credentials valid (token received)");
    } else {
      console.log(`  ✗ Spotify API authentication failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`  ✗ Spotify API error: ${error.message}`);
  }
}

async function testTicketmaster() {
  if (!process.env.TICKETMASTER_API_KEY) {
    console.log("  ⚠️  Ticketmaster: Skipping test (missing API key)");
    return;
  }

  try {
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env.TICKETMASTER_API_KEY}&size=1`,
    );

    if (response.ok) {
      console.log("  ✓ Ticketmaster API key valid");
    } else if (response.status === 401) {
      console.log("  ✗ Ticketmaster API key invalid");
    } else {
      console.log(`  ✗ Ticketmaster API error: ${response.status}`);
    }
  } catch (error) {
    console.log(`  ✗ Ticketmaster API error: ${error.message}`);
  }
}

async function testDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log("  ⚠️  Database: Skipping test (missing DATABASE_URL)");
    return;
  }

  // Parse the connection string
  const match = process.env.DATABASE_URL.match(
    /postgresql:\/\/(.+):(.+)@(.+):(\d+)\/(.+)/,
  );
  if (match) {
    const [, user, , host, port, database] = match;
    console.log(`  ℹ️  Database: ${user}@${host}:${port}/${database}`);
    console.log("  ℹ️  Database connection test requires running application");
  } else {
    console.log("  ✗ Invalid DATABASE_URL format");
  }
}

// Run all tests
Promise.all([
  testSupabase(),
  testSpotify(),
  testTicketmaster(),
  testDatabase(),
]).then(() => {
  console.log("\n" + "=".repeat(60));

  if (hasErrors) {
    console.log("\n❌ Environment validation FAILED!\n");
    console.log("Missing required variables:");
    missingVars.forEach((varName) => {
      console.log(`  - ${varName}`);
    });
    console.log("\nPlease add these variables in your Vercel dashboard:");
    console.log("Settings → Environment Variables → Add Variable");
    console.log("\nRefer to VERCEL_ENV_SETUP.md for the exact values.");
    process.exit(1);
  } else {
    console.log("\n✅ All required environment variables are configured!");
    console.log("🚀 Your app is ready for deployment to Vercel\n");
    console.log("Next steps:");
    console.log("  1. Commit and push your changes");
    console.log("  2. Vercel will automatically deploy");
    console.log("  3. Check deployment logs for any issues");
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  console.error("\n⚠️  Unexpected error:", error);
  process.exit(1);
});
