#!/usr/bin/env tsx

/**
 * Environment Variable Validation Script
 * Validates all required environment variables for TheSet application
 */

import { z } from "zod";

// Define validation schema based on env.ts
const envSchema = z.object({
  // Application URLs
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),

  // Database
  DATABASE_URL: z.string().min(1, "Database URL is required"),
  DIRECT_URL: z.string().min(1, "Direct database URL is required"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required"),
  SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Supabase service role key is required"),
  SUPABASE_JWT_SECRET: z.string().min(1, "Supabase JWT secret is required"),

  // External APIs
  SPOTIFY_CLIENT_ID: z.string().min(1, "Spotify client ID is required"),
  SPOTIFY_CLIENT_SECRET: z.string().min(1, "Spotify client secret is required"),
  TICKETMASTER_API_KEY: z.string().min(1, "Ticketmaster API key is required"),
  SETLISTFM_API_KEY: z.string().min(1, "Setlist.fm API key is required").optional(),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(32, "NextAuth secret must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url().optional(),

  // Security
  CRON_SECRET: z.string().min(1, "Cron secret is required").optional(),
  ADMIN_API_KEY: z.string().min(1, "Admin API key is required").optional(),

  // Redis
  REDIS_URL: z.string().min(1, "Redis URL is required").optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

// Test API connections
async function testAPIConnections() {
  const results = {
    spotify: false,
    ticketmaster: false,
    supabase: false,
    redis: false,
  };

  // Test Spotify API
  try {
    if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
        body: "grant_type=client_credentials",
      });
      results.spotify = response.ok;
    }
  } catch (error) {
    console.warn("Spotify API test failed:", error);
  }

  // Test Ticketmaster API
  try {
    if (process.env.TICKETMASTER_API_KEY) {
      const response = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env.TICKETMASTER_API_KEY}&size=1`
      );
      results.ticketmaster = response.ok;
    }
  } catch (error) {
    console.warn("Ticketmaster API test failed:", error);
  }

  // Test Supabase connection
  try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
      const { error } = await supabase.from("artists").select("id").limit(1);
      results.supabase = !error;
    }
  } catch (error) {
    console.warn("Supabase connection test failed:", error);
  }

  // Test Redis connection
  try {
    if (process.env.REDIS_URL) {
      const { Redis } = await import("ioredis");
      const redis = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        retryStrategy: () => null, // Don't retry for validation
      });
      await redis.ping();
      results.redis = true;
      await redis.quit();
    }
  } catch (error) {
    console.warn("Redis connection test failed:", error);
  }

  return results;
}

// Main validation function
async function validateEnvironment() {
  console.log("🔍 Validating environment configuration...\n");

  // Load environment variables
  const env = process.env;

  // Validate required environment variables
  try {
    const validatedEnv = envSchema.parse(env);
    console.log("✅ Environment variable validation passed\n");
  } catch (error) {
    console.error("❌ Environment variable validation failed:");
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
    }
    console.log("");
    return false;
  }

  // Test API connections
  console.log("🌐 Testing API connections...");
  const apiResults = await testAPIConnections();

  Object.entries(apiResults).forEach(([service, success]) => {
    const icon = success ? "✅" : "❌";
    console.log(`  ${icon} ${service.charAt(0).toUpperCase() + service.slice(1)}`);
  });

  console.log("");

  // Check for missing optional but recommended variables
  const recommendedVars = [
    "CRON_SECRET",
    "ADMIN_API_KEY",
    "SETLISTFM_API_KEY",
    "REDIS_URL",
    "NEXT_PUBLIC_VERCEL_ANALYTICS",
  ];

  const missingRecommended = recommendedVars.filter((varName) => !env[varName]);
  if (missingRecommended.length > 0) {
    console.log("⚠️  Missing recommended environment variables:");
    missingRecommended.forEach((varName) => {
      console.log(`  - ${varName}`);
    });
    console.log("");
  }

  // Final summary
  const allApisPassing = Object.values(apiResults).every(Boolean);
  if (allApisPassing) {
    console.log("🎉 All environment checks passed! Your application is ready to run.");
  } else {
    console.log("⚠️  Some API connections failed. Check your configuration.");
  }

  return allApisPassing;
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateEnvironment()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Environment validation error:", error);
      process.exit(1);
    });
}

export { validateEnvironment };