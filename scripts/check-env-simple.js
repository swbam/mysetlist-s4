#!/usr/bin/env node

/**
 * Simple Environment Variables Check
 * No external dependencies required
 */

// Required environment variables
const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "TICKETMASTER_API_KEY",
  "SETLISTFM_API_KEY",
];

const OPTIONAL_VARS = ["NEXT_PUBLIC_APP_URL", "VERCEL_URL"];

function checkEnvVars() {
  console.log("🔧 Environment Variables Check");
  console.log("=".repeat(50));
  console.log("");

  let allValid = true;
  const missing = [];
  const present = [];

  // Check required variables
  console.log("📋 Required Variables:");
  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];
    const hasValue = !!value;
    const status = hasValue ? "✅" : "❌";

    console.log(`${status} ${varName}: ${hasValue ? "Present" : "MISSING"}`);

    if (hasValue) {
      present.push(varName);
      // Show partial value for verification (security)
      const displayValue =
        value.length > 20
          ? `${value.substring(0, 10)}...${value.substring(value.length - 5)}`
          : `${value.substring(0, 10)}...`;
      console.log(`   Value: ${displayValue}`);
    } else {
      missing.push(varName);
      allValid = false;
    }
  }

  console.log("");
  console.log("🔧 Optional Variables:");
  for (const varName of OPTIONAL_VARS) {
    const value = process.env[varName];
    const hasValue = !!value;
    const status = hasValue ? "✅" : "⚠️ ";

    console.log(`${status} ${varName}: ${hasValue ? "Present" : "Not set"}`);
    if (hasValue) {
      console.log(`   Value: ${value}`);
    }
  }

  console.log("");
  console.log("📊 Summary:");
  console.log(
    `   Required variables present: ${present.length}/${REQUIRED_VARS.length}`,
  );

  if (missing.length > 0) {
    console.log(`   Missing required variables: ${missing.join(", ")}`);
  }

  if (allValid) {
    console.log("✅ All required environment variables are configured!");
  } else {
    console.log("❌ Some required environment variables are missing.");
    console.log("");
    console.log("💡 To fix this:");
    console.log("   1. Check your .env.local file in apps/web/");
    console.log("   2. Verify Vercel environment variables if deployed");
    console.log("   3. Make sure all API keys are valid and active");
  }

  return { allValid, missing, present };
}

// Run check
if (require.main === module) {
  const result = checkEnvVars();
  process.exit(result.allValid ? 0 : 1);
}

module.exports = { checkEnvVars };
