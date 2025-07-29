#!/usr/bin/env node
import { resolve } from "path";
import { config } from "dotenv";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

interface EnvCheck {
  name: string;
  key: string;
  required: boolean;
  testFunction?: () => Promise<boolean>;
}

const envChecks: EnvCheck[] = [
  // Database
  {
    name: "Database URL",
    key: "DATABASE_URL",
    required: true,
  },
  {
    name: "Direct Database URL",
    key: "DIRECT_URL",
    required: false,
  },

  // Supabase
  {
    name: "Supabase URL",
    key: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
  },
  {
    name: "Supabase Anon Key",
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
  },
  {
    name: "Supabase Service Role Key",
    key: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
  },

  // External APIs
  {
    name: "Spotify Client ID",
    key: "SPOTIFY_CLIENT_ID",
    required: true,
    testFunction: async () => {
      try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
            ).toString("base64")}`,
          },
          body: "grant_type=client_credentials",
        });
        return response.ok;
      } catch {
        return false;
      }
    },
  },
  {
    name: "Spotify Client Secret",
    key: "SPOTIFY_CLIENT_SECRET",
    required: true,
  },
  {
    name: "Ticketmaster API Key",
    key: "TICKETMASTER_API_KEY",
    required: true,
    testFunction: async () => {
      try {
        const response = await fetch(
          `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env.TICKETMASTER_API_KEY}&size=1`,
        );
        return response.ok;
      } catch {
        return false;
      }
    },
  },
  {
    name: "Setlist.fm API Key",
    key: "SETLISTFM_API_KEY",
    required: true,
    testFunction: async () => {
      try {
        const response = await fetch(
          "https://api.setlist.fm/rest/1.0/search/artists?artistName=test&p=1",
          {
            headers: {
              "x-api-key": process.env.SETLISTFM_API_KEY || "",
              Accept: "application/json",
            },
          },
        );
        return response.ok;
      } catch {
        return false;
      }
    },
  },

  // Cron Secret
  {
    name: "Cron Secret",
    key: "CRON_SECRET",
    required: true,
  },

  // Optional APIs
  {
    name: "Resend API Key",
    key: "RESEND_API_KEY",
    required: false,
  },
  {
    name: "Sentry DSN",
    key: "NEXT_PUBLIC_SENTRY_DSN",
    required: false,
  },
];

async function checkEnvironment() {
  console.log("🔍 Checking environment variables...\n");

  let hasErrors = false;
  const results: {
    check: EnvCheck;
    value: string | undefined;
    testResult?: boolean;
  }[] = [];

  // Check each environment variable
  for (const check of envChecks) {
    const value = process.env[check.key];
    const result = {
      check,
      value,
      testResult: undefined as boolean | undefined,
    };

    if (!value && check.required) {
      hasErrors = true;
    }

    // Run test function if available and value exists
    if (value && check.testFunction) {
      console.log(`🧪 Testing ${check.name}...`);
      result.testResult = await check.testFunction();
    }

    results.push(result);
  }

  // Display results
  console.log("\n📊 Environment Variable Status:\n");
  console.log("=".repeat(80));

  for (const { check, value, testResult } of results) {
    const status = value
      ? testResult === false
        ? "❌ FAILED TEST"
        : testResult === true
          ? "✅ VERIFIED"
          : "✓ SET"
      : check.required
        ? "❌ MISSING"
        : "⚪ NOT SET";

    const valueDisplay = value
      ? value.length > 40
        ? `${value.substring(0, 20)}...${value.substring(value.length - 10)}`
        : value
      : "undefined";

    console.log(
      `${status.padEnd(15)} | ${check.name.padEnd(30)} | ${check.key.padEnd(35)} | ${
        value ? valueDisplay : "(not set)"
      }`,
    );
  }

  console.log("=".repeat(80));

  // Summary
  const totalRequired = envChecks.filter((c) => c.required).length;
  const setRequired = results.filter((r) => r.check.required && r.value).length;
  const totalOptional = envChecks.filter((c) => !c.required).length;
  const setOptional = results.filter(
    (r) => !r.check.required && r.value,
  ).length;
  const failedTests = results.filter((r) => r.testResult === false).length;

  console.log("\n📈 Summary:");
  console.log(`   Required: ${setRequired}/${totalRequired} set`);
  console.log(`   Optional: ${setOptional}/${totalOptional} set`);
  if (failedTests > 0) {
    console.log(`   ⚠️  Failed Tests: ${failedTests}`);
  }

  if (hasErrors) {
    console.log("\n❌ Missing required environment variables!");
    console.log("   Please set all required variables in your .env.local file");
    process.exit(1);
  } else if (failedTests > 0) {
    console.log("\n⚠️  Some API connections failed!");
    console.log("   Please verify your API keys are correct and active");
    process.exit(1);
  } else {
    console.log("\n✅ All required environment variables are set!");
    if (setRequired === totalRequired) {
      console.log(
        "   Your environment is properly configured for the sync system",
      );
    }
  }

  // Additional sync-specific checks
  console.log("\n🔄 Sync System Requirements:");
  const syncReady =
    process.env.SPOTIFY_CLIENT_ID &&
    process.env.SPOTIFY_CLIENT_SECRET &&
    process.env.TICKETMASTER_API_KEY &&
    process.env.SETLISTFM_API_KEY &&
    process.env.CRON_SECRET;

  if (syncReady) {
    console.log("   ✅ All APIs configured for autonomous sync");
  } else {
    console.log("   ❌ Missing APIs for autonomous sync:");
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      console.log("      - Spotify credentials");
    }
    if (!process.env.TICKETMASTER_API_KEY) {
      console.log("      - Ticketmaster API key");
    }
    if (!process.env.SETLISTFM_API_KEY) {
      console.log("      - Setlist.fm API key");
    }
    if (!process.env.CRON_SECRET) {
      console.log("      - Cron secret");
    }
  }
}

// Run the check
checkEnvironment().catch(console.error);
