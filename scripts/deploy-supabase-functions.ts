#!/usr/bin/env tsx
/**
 * Deploy all Supabase Edge Functions and set up cron schedules
 */

import { execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

interface FunctionConfig {
  name: string;
  schedule?: string;
  secrets?: Record<string, string>;
}

const EDGE_FUNCTIONS: FunctionConfig[] = [
  {
    name: "scheduled-sync",
    schedule: "0 */6 * * *", // Every 6 hours
    secrets: {
      CRON_SECRET: process.env.CRON_SECRET || "",
    },
  },
  {
    name: "sync-artists",
    secrets: {
      SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || "",
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || "",
    },
  },
  {
    name: "sync-artist-shows",
    secrets: {
      TICKETMASTER_API_KEY: process.env.TICKETMASTER_API_KEY || "",
    },
  },
  {
    name: "sync-setlists",
    secrets: {
      SETLISTFM_API_KEY: process.env.SETLISTFM_API_KEY || "",
    },
  },
  {
    name: "sync-shows",
    secrets: {
      TICKETMASTER_API_KEY: process.env.TICKETMASTER_API_KEY || "",
    },
  },
  {
    name: "sync-song-catalog",
    secrets: {
      SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || "",
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || "",
    },
  },
  {
    name: "update-trending",
  },
];

async function deployFunctions() {
  console.log("🚀 Deploying Supabase Edge Functions\n");

  const functionsDir = join(process.cwd(), "supabase", "functions");

  if (!existsSync(functionsDir)) {
    console.error("❌ Supabase functions directory not found");
    process.exit(1);
  }

  // Check if Supabase CLI is installed
  try {
    execSync("supabase --version", { stdio: "ignore" });
  } catch {
    console.error(
      "❌ Supabase CLI not found. Install it with: npm install -g supabase",
    );
    process.exit(1);
  }

  // Deploy each function
  for (const func of EDGE_FUNCTIONS) {
    const funcPath = join(functionsDir, func.name);

    if (!existsSync(funcPath)) {
      console.warn(
        `⚠️  Function ${func.name} directory not found, skipping...`,
      );
      continue;
    }

    console.log(`📦 Deploying ${func.name}...`);

    try {
      // Deploy the function
      execSync(`supabase functions deploy ${func.name}`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });

      // Set secrets if any
      if (func.secrets && Object.keys(func.secrets).length > 0) {
        console.log(`🔐 Setting secrets for ${func.name}...`);

        const secretsCmd = Object.entries(func.secrets)
          .map(([key, value]) => `${key}="${value}"`)
          .join(" ");

        execSync(`supabase secrets set ${secretsCmd} --function ${func.name}`, {
          stdio: "inherit",
          cwd: process.cwd(),
        });
      }

      console.log(`✅ ${func.name} deployed successfully\n`);
    } catch (error) {
      console.error(`❌ Failed to deploy ${func.name}:`, error.message);
      // Continue with other functions
    }
  }

  // Set up cron schedules using pg_cron
  console.log("\n⏰ Setting up cron schedules...");

  const cronJobs = `
-- Remove existing cron jobs
SELECT cron.unschedule('sync-artists-job');
SELECT cron.unschedule('update-trending-job');

-- Schedule artist sync every 6 hours
SELECT cron.schedule(
  'sync-artists-job',
  '0 */6 * * *',
  $$
  SELECT 
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/scheduled-sync',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('type', 'artists', 'limit', 20)
    );
  $$
);

-- Schedule trending update every 2 hours
SELECT cron.schedule(
  'update-trending-job',
  '0 */2 * * *',
  $$
  SELECT 
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/scheduled-sync',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('type', 'trending')
    );
  $$
);
`;

  try {
    // Create a migration file for cron jobs
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")[0];
    const migrationPath = join(
      process.cwd(),
      "supabase",
      "migrations",
      `${timestamp}_setup_cron_jobs.sql`,
    );

    require("fs").writeFileSync(migrationPath, cronJobs);
    console.log(`✅ Created cron migration: ${migrationPath}`);

    // Apply the migration
    execSync("supabase db push", { stdio: "inherit", cwd: process.cwd() });
    console.log("✅ Cron schedules set up successfully");
  } catch (error) {
    console.error("❌ Failed to set up cron schedules:", error.message);
  }

  console.log("\n✨ Supabase functions deployment complete!");
}

// Run the deployment
deployFunctions().catch(console.error);
