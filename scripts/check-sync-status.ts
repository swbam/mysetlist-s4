#!/usr/bin/env node
import { resolve } from "node:path";
import { config } from "dotenv";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3001";

interface SyncStatus {
  healthScore: {
    overall: number;
    syncCoverage: number;
    syncFreshness: number;
    trendingCoverage: number;
    errorRate: number;
  };
  statistics: {
    artists: {
      total: number;
      synced: number;
      syncedRecently: number;
      needsSync: number;
      withTrending: number;
    };
    shows: {
      total: number;
      upcoming: number;
      completed: number;
      withTrending: number;
      createdRecently: number;
    };
    venues: {
      total: number;
      withShows: number;
      createdRecently: number;
    };
  };
  syncSummary: {
    masterSync: {
      runs: number;
      success: number;
      errors: number;
      lastRun: Date | null;
    };
    autonomousSync: {
      runs: number;
      success: number;
      errors: number;
      lastRun: Date | null;
    };
    trendingCalc: {
      runs: number;
      success: number;
      errors: number;
      lastRun: Date | null;
    };
    artistDiscovery: { found: number; added: number };
    showsSync: { found: number; added: number };
  };
  trending: {
    artists: Array<{ name: string; trendingScore: number }>;
    shows: Array<{ name: string; trendingScore: number }>;
  };
}

async function checkSyncStatus(hours = 24) {
  console.log(`📊 Checking sync status for the last ${hours} hours...\n`);

  try {
    const response = await fetch(`${APP_URL}/api/sync/monitor?hours=${hours}`);

    if (!response.ok) {
      throw new Error(`Failed to get sync status: ${response.statusText}`);
    }

    const data: SyncStatus = await response.json();

    // Display health score with color coding
    console.log("🏥 HEALTH SCORE");
    console.log("═".repeat(60));
    displayHealthMetric("Overall Health", data.healthScore.overall);
    displayHealthMetric("Sync Coverage", data.healthScore.syncCoverage);
    displayHealthMetric("Sync Freshness", data.healthScore.syncFreshness);
    displayHealthMetric("Trending Coverage", data.healthScore.trendingCoverage);
    displayHealthMetric("Success Rate", data.healthScore.errorRate);

    // Display statistics
    console.log("\n📈 DATABASE STATISTICS");
    console.log("═".repeat(60));
    console.log("Artists:");
    console.log(`  Total: ${data.statistics.artists.total.toLocaleString()}`);
    console.log(
      `  Synced: ${data.statistics.artists.synced.toLocaleString()} (${getPercentage(data.statistics.artists.synced, data.statistics.artists.total)}%)`,
    );
    console.log(
      `  Need Sync: ${data.statistics.artists.needsSync.toLocaleString()}`,
    );
    console.log(
      `  With Trending: ${data.statistics.artists.withTrending.toLocaleString()}`,
    );

    console.log("\nShows:");
    console.log(`  Total: ${data.statistics.shows.total.toLocaleString()}`);
    console.log(
      `  Upcoming: ${data.statistics.shows.upcoming.toLocaleString()}`,
    );
    console.log(
      `  Completed: ${data.statistics.shows.completed.toLocaleString()}`,
    );
    console.log(
      `  Recently Added: ${data.statistics.shows.createdRecently.toLocaleString()}`,
    );

    console.log("\nVenues:");
    console.log(`  Total: ${data.statistics.venues.total.toLocaleString()}`);
    console.log(
      `  With Shows: ${data.statistics.venues.withShows.toLocaleString()}`,
    );

    // Display sync operations
    console.log("\n🔄 SYNC OPERATIONS");
    console.log("═".repeat(60));

    displaySyncOperation("Master Sync", data.syncSummary.masterSync);
    displaySyncOperation("Autonomous Sync", data.syncSummary.autonomousSync);
    displaySyncOperation("Trending Calc", data.syncSummary.trendingCalc);

    if (data.syncSummary.artistDiscovery.found > 0) {
      console.log("\n🎵 Artist Discovery:");
      console.log(`  Found: ${data.syncSummary.artistDiscovery.found}`);
      console.log(`  Added: ${data.syncSummary.artistDiscovery.added}`);
    }

    if (data.syncSummary.showsSync.found > 0) {
      console.log("\n📅 Shows Sync:");
      console.log(`  Processed: ${data.syncSummary.showsSync.found}`);
      console.log(`  Added: ${data.syncSummary.showsSync.added}`);
    }

    // Display trending content
    if (data.trending.artists.length > 0 || data.trending.shows.length > 0) {
      console.log("\n🔥 TOP TRENDING");
      console.log("═".repeat(60));

      if (data.trending.artists.length > 0) {
        console.log("Artists:");
        data.trending.artists.slice(0, 5).forEach((artist, i) => {
          console.log(
            `  ${i + 1}. ${artist.name} (score: ${artist.trendingScore.toFixed(2)})`,
          );
        });
      }

      if (data.trending.shows.length > 0) {
        console.log("\nShows:");
        data.trending.shows.slice(0, 5).forEach((show, i) => {
          console.log(
            `  ${i + 1}. ${show.name} (score: ${show.trendingScore.toFixed(2)})`,
          );
        });
      }
    }

    // Recommendations
    console.log("\n💡 RECOMMENDATIONS");
    console.log("═".repeat(60));

    if (data.healthScore.overall < 50) {
      console.log("⚠️  System health is poor. Consider:");
      console.log(
        "   - Running a full sync: pnpm trigger-sync master-sync --mode full",
      );
      console.log("   - Checking for errors in logs");
    } else if (data.healthScore.overall < 80) {
      console.log("⚠️  System health could be improved:");
      if (data.healthScore.syncCoverage < 80) {
        console.log(
          "   - Low sync coverage: Run discovery to find new artists",
        );
      }
      if (data.healthScore.syncFreshness < 80) {
        console.log(
          "   - Stale data: Increase sync frequency or run manual sync",
        );
      }
      if (data.healthScore.trendingCoverage < 50) {
        console.log("   - Low trending coverage: Run trending calculation");
      }
    } else {
      console.log("✅ System is healthy and running well!");
    }

    if (
      data.statistics.artists.needsSync >
      data.statistics.artists.total * 0.3
    ) {
      console.log("\n📌 Many artists need syncing:");
      console.log("   pnpm trigger-sync master-sync --mode daily");
    }

    if (data.statistics.artists.total === 0) {
      console.log("\n📌 No artists in database! Run initial discovery:");
      console.log("   pnpm trigger-sync autonomous-discovery --mode discovery");
    }
  } catch (error) {
    console.error("❌ Failed to check sync status:", error);
    process.exit(1);
  }
}

function displayHealthMetric(name: string, value: number) {
  const icon = value >= 80 ? "✅" : value >= 50 ? "⚠️ " : "❌";
  const color =
    value >= 80 ? "\x1b[32m" : value >= 50 ? "\x1b[33m" : "\x1b[31m";
  const reset = "\x1b[0m";

  console.log(`${icon} ${name}: ${color}${value}%${reset}`);
}

function displaySyncOperation(name: string, data: any) {
  if (data.runs === 0) {
    console.log(`\n${name}: No runs in time period`);
    return;
  }

  const successRate =
    data.runs > 0 ? Math.round((data.success / data.runs) * 100) : 0;
  const status = successRate >= 80 ? "✅" : successRate >= 50 ? "⚠️ " : "❌";

  console.log(`\n${name}:`);
  console.log(
    `  Runs: ${data.runs} (${data.success} success, ${data.errors} errors)`,
  );
  console.log(`  Success Rate: ${status} ${successRate}%`);

  if (data.lastRun) {
    const timeSince = getTimeSince(new Date(data.lastRun));
    console.log(`  Last Run: ${timeSince}`);
  }
}

function getPercentage(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function getTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

// Parse command line arguments
const hours = process.argv[2] ? Number.parseInt(process.argv[2]) : 24;

// Run the check
checkSyncStatus(hours).catch(console.error);
