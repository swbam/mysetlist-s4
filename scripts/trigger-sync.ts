#!/usr/bin/env node
import { resolve } from "path";
import { config } from "dotenv";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
const CRON_SECRET = process.env.CRON_SECRET;

interface SyncOptions {
  endpoint: string;
  mode?: string;
  limit?: number;
  dryRun?: boolean;
}

const endpoints = {
  "autonomous-discovery": {
    path: "/api/cron/autonomous-sync",
    modes: ["discovery", "sync", "full"],
    description: "Discover new artists from Ticketmaster/Spotify",
  },
  "master-sync": {
    path: "/api/cron/master-sync",
    modes: ["daily", "hourly", "full"],
    description: "Sync existing artists comprehensively",
  },
  trending: {
    path: "/api/cron/calculate-trending",
    modes: ["daily", "hourly"],
    description: "Calculate trending scores",
  },
  sync: {
    path: "/api/cron/sync",
    modes: [],
    description: "Legacy sync endpoint",
  },
};

async function triggerSync(options: SyncOptions) {
  const endpoint = endpoints[options.endpoint as keyof typeof endpoints];
  if (!endpoint) {
    console.error(`❌ Unknown endpoint: ${options.endpoint}`);
    console.log("\nAvailable endpoints:");
    Object.entries(endpoints).forEach(([key, value]) => {
      console.log(`  ${key}: ${value.description}`);
      if (value.modes.length > 0) {
        console.log(`    Modes: ${value.modes.join(", ")}`);
      }
    });
    process.exit(1);
  }

  // Build URL with query parameters
  const url = new URL(`${APP_URL}${endpoint.path}`);
  if (options.mode) url.searchParams.append("mode", options.mode);
  if (options.limit) url.searchParams.append("limit", options.limit.toString());
  if (options.dryRun) url.searchParams.append("dry-run", "true");

  console.log(`\n🚀 Triggering sync...`);
  console.log(`   Endpoint: ${options.endpoint}`);
  console.log(`   URL: ${url.toString()}`);
  if (options.mode) console.log(`   Mode: ${options.mode}`);
  if (options.limit) console.log(`   Limit: ${options.limit}`);
  if (options.dryRun) console.log(`   Dry run: ${options.dryRun}`);
  console.log("");

  try {
    const startTime = Date.now();
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(CRON_SECRET ? { Authorization: `Bearer ${CRON_SECRET}` } : {}),
      },
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Sync failed (${response.status}): ${error}`);
      process.exit(1);
    }

    const result = await response.json();

    console.log(`✅ Sync completed in ${duration}s\n`);

    // Display results based on endpoint type
    if (options.endpoint === "autonomous-discovery" && result.discovery) {
      console.log("📊 Discovery Results:");
      console.log(
        `   Ticketmaster: ${result.discovery.ticketmaster.found} found, ${result.discovery.ticketmaster.added} added`,
      );
      console.log(
        `   Spotify: ${result.discovery.spotify.found} found, ${result.discovery.spotify.added} added`,
      );

      if (result.sync) {
        console.log("\n🔄 Sync Results:");
        console.log(
          `   Artists: ${result.sync.artists.processed} processed, ${result.sync.artists.updated} updated`,
        );
        console.log(
          `   Shows: ${result.sync.shows.processed} processed, ${result.sync.shows.added} added`,
        );
      }

      if (result.trending) {
        console.log("\n📈 Trending Calculation:");
        console.log(`   Updated: ${result.trending.updated} artists`);
      }
    } else if (options.endpoint === "master-sync" && result.phases) {
      console.log("📊 Master Sync Results:");
      console.log(
        `   Popular Artists: ${result.phases.popularArtists.synced}/${result.phases.popularArtists.processed} synced`,
      );
      console.log(`   Shows: ${result.phases.shows.synced} synced`);
      console.log(`   Setlists: ${result.phases.setlists.synced} synced`);

      if (result.summary) {
        console.log("\n📈 Summary:");
        console.log(`   Artists Updated: ${result.summary.artistsUpdated}`);
        console.log(`   Shows Created: ${result.summary.showsCreated}`);
        console.log(`   Total Errors: ${result.summary.totalErrors}`);
      }
    } else if (options.endpoint === "trending" && result.results) {
      console.log("📊 Trending Calculation Results:");
      console.log(`   Artists: ${result.results.artists.updated} updated`);
      console.log(`   Shows: ${result.results.shows.updated} updated`);

      if (result.results.trending) {
        console.log("\n🔥 Top Trending:");
        console.log(`   Top Artist: ${result.results.trending.topArtist}`);
        console.log(`   Top Show: ${result.results.trending.topShow}`);
      }
    }

    if (result.errors && result.errors.length > 0) {
      console.log("\n⚠️  Errors:");
      result.errors.forEach((error: string) => console.log(`   - ${error}`));
    }

    if (result.duration) {
      console.log(`\n⏱️  Total duration: ${result.duration}`);
    }
  } catch (error) {
    console.error(
      "❌ Request failed:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

// Parse command line arguments
function printUsage() {
  console.log(`
Usage: pnpm trigger-sync [endpoint] [options]

Endpoints:
  autonomous-discovery  Discover new artists from external APIs
  master-sync          Sync existing artists comprehensively  
  trending             Calculate trending scores
  sync                 Legacy sync endpoint

Options:
  --mode <mode>        Sync mode (varies by endpoint)
  --limit <number>     Limit number of items to process
  --dry-run            Simulate sync without making changes
  --help               Show this help message

Examples:
  pnpm trigger-sync autonomous-discovery --mode discovery --limit 10
  pnpm trigger-sync master-sync --mode daily
  pnpm trigger-sync trending --mode hourly
`);
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help")) {
  printUsage();
  process.exit(0);
}

const endpoint = args[0];
const options: SyncOptions = { endpoint };

// Parse remaining arguments
for (let i = 1; i < args.length; i++) {
  switch (args[i]) {
    case "--mode":
      options.mode = args[++i];
      break;
    case "--limit":
      options.limit = Number.parseInt(args[++i]);
      break;
    case "--dry-run":
      options.dryRun = true;
      break;
  }
}

// Check environment
if (!CRON_SECRET) {
  console.warn(
    "⚠️  Warning: CRON_SECRET not set - requests may be unauthorized",
  );
}

// Run sync
triggerSync(options).catch(console.error);
