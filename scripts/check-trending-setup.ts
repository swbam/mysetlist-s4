#!/usr/bin/env tsx

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

// Load environment variables
config({ path: resolve(__dirname, "../.env.local") });

console.log("🔍 Checking trending setup...\n");

// Check required environment variables
const requiredEnvVars = [
  { name: "CRON_SECRET", description: "Required for cron job authentication" },
  { name: "ADMIN_API_KEY", description: "Required for admin API endpoints" },
  { name: "DATABASE_URL", description: "Required for database connection" },
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    description: "Required for Supabase client",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    description: "Required for Supabase client",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    description: "Required for server-side operations",
  },
];

const missingVars: string[] = [];
const presentVars: string[] = [];

console.log("📋 Environment Variables:");
console.log("========================\n");

requiredEnvVars.forEach(({ name, description }) => {
  if (process.env[name]) {
    console.log(`✅ ${name}: Set`);
    console.log(`   ${description}`);
    presentVars.push(name);
  } else {
    console.log(`❌ ${name}: Missing`);
    console.log(`   ${description}`);
    missingVars.push(name);
  }
  console.log("");
});

// Check if .env.local exists
const envLocalPath = resolve(__dirname, "../.env.local");
const envExamplePath = resolve(__dirname, "../.env.example");

console.log("\n📁 Environment Files:");
console.log("====================\n");

if (existsSync(envLocalPath)) {
  console.log("✅ .env.local exists");
} else {
  console.log("❌ .env.local is missing");
  console.log("   Create it by copying .env.example:");
  console.log("   cp .env.example .env.local");
}

// Generate a sample CRON_SECRET if missing
if (!process.env.CRON_SECRET) {
  const generateSecret = () => {
    return Array.from({ length: 32 }, () =>
      Math.random().toString(36).charAt(2),
    ).join("");
  };

  console.log("\n🔐 Sample CRON_SECRET:");
  console.log("====================");
  console.log(`CRON_SECRET=${generateSecret()}`);
  console.log("\nAdd this to your .env.local file");
}

// Check cron configuration
console.log("\n⏰ Cron Configuration:");
console.log("====================\n");

const vercelJsonPath = resolve(__dirname, "../vercel.json");
if (existsSync(vercelJsonPath)) {
  try {
    const vercelConfig = JSON.parse(readFileSync(vercelJsonPath, "utf-8"));
    if (vercelConfig.crons) {
      console.log("✅ Cron jobs configured in vercel.json:");
      vercelConfig.crons.forEach((cron: any) => {
        console.log(`   - ${cron.path} (${cron.schedule})`);
      });
    } else {
      console.log("⚠️ No cron jobs configured in vercel.json");
    }
  } catch (error) {
    console.log("❌ Failed to parse vercel.json");
  }
} else {
  console.log("⚠️ vercel.json not found (cron jobs won't run on Vercel)");
}

// Summary
console.log("\n📊 Summary:");
console.log("==========\n");

if (missingVars.length === 0) {
  console.log("✅ All required environment variables are set!");
  console.log("\n🚀 You can now run:");
  console.log("   pnpm init:trending    # Initialize trending data");
  console.log("   pnpm trigger:trending # Manually trigger trending update");
} else {
  console.log(
    `❌ Missing ${missingVars.length} required environment variables:`,
  );
  missingVars.forEach((v) => console.log(`   - ${v}`));
  console.log("\n📝 Next steps:");
  console.log("1. Copy .env.example to .env.local if not done");
  console.log("2. Fill in the missing environment variables");
  console.log("3. Run this script again to verify");
}

process.exit(missingVars.length > 0 ? 1 : 0);
