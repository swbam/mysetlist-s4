#!/usr/bin/env tsx
/**
 * Initialize MySetlist app with data and trending scores
 * This script populates the database and initializes the trending system
 */

import "dotenv/config";

const APP_URL = process.env["NEXT_PUBLIC_URL"] || "http://localhost:3001";
const ADMIN_KEY = process.env["ADMIN_API_KEY"];

async function checkDataStatus() {
  try {
    console.log("🔍 Checking current data status...");
    const response = await fetch(`${APP_URL}/api/admin/init-trending`, {
      method: "GET",
    });

    if (response.ok) {
      const data = await response.json();
      console.log(
        `  Artists with trending scores: ${data.stats.trendingArtists}`,
      );
      console.log(`  Shows with trending scores: ${data.stats.trendingShows}`);

      if (data.stats.topArtists?.length > 0) {
        console.log("\n  Top Trending Artists:");
        data.stats.topArtists.forEach((artist: any, index: number) => {
          console.log(
            `    ${index + 1}. ${artist.name} (Score: ${artist.trendingScore?.toFixed(2)})`,
          );
        });
      }

      return {
        hasData: data.stats.trendingArtists > 0 || data.stats.trendingShows > 0,
        stats: data.stats,
      };
    }
  } catch (error) {
    console.error("Error checking data status:", error);
  }

  return { hasData: false, stats: {} };
}

async function initializeData() {
  console.log("\n🚀 Initializing MySetlist data...");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (ADMIN_KEY) {
    headers["Authorization"] = `Bearer ${ADMIN_KEY}`;
  }

  try {
    const response = await fetch(`${APP_URL}/api/admin/initialize-data`, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Initialization failed: ${error}`);
    }

    const result = await response.json();

    console.log("\n✅ Data initialization complete!");
    console.log("\n📊 Summary:");
    console.log(`  Artists: ${result.summary.totalCounts.artists}`);
    console.log(`  Shows: ${result.summary.totalCounts.shows}`);
    console.log(`  Venues: ${result.summary.totalCounts.venues}`);
    console.log(`  Songs: ${result.summary.totalCounts.songs}`);

    if (result.summary.topTrending.artists?.length > 0) {
      console.log("\n🔥 Top Trending Artists:");
      result.summary.topTrending.artists.forEach(
        (artist: any, index: number) => {
          console.log(
            `  ${index + 1}. ${artist.name} (Score: ${artist.trendingScore?.toFixed(2)}, Popularity: ${artist.popularity})`,
          );
        },
      );
    }

    if (result.summary.topTrending.shows?.length > 0) {
      console.log("\n🎤 Top Trending Shows:");
      result.summary.topTrending.shows.forEach((show: any, index: number) => {
        const date = new Date(show.date).toLocaleDateString();
        console.log(
          `  ${index + 1}. ${show.name} on ${date} (Score: ${show.trendingScore?.toFixed(2)})`,
        );
      });
    }

    return true;
  } catch (error) {
    console.error("❌ Initialization failed:", error);
    return false;
  }
}

async function syncRealArtists() {
  console.log("\n🎵 Syncing real artists from Ticketmaster...");

  try {
    const response = await fetch(`${APP_URL}/api/artists/sync`, {
      method: "GET",
    });

    if (!response.ok) {
      console.log(
        "⚠️  Could not sync real artists (API keys may not be configured)",
      );
      return;
    }

    const result = await response.json();

    if (result.success && result.syncedCount > 0) {
      console.log(`✅ Synced ${result.syncedCount} real artists`);
      if (result.trendingArtists?.length > 0) {
        console.log("\n  Trending Artists with Upcoming Shows:");
        result.trendingArtists
          .slice(0, 5)
          .forEach((artist: any, index: number) => {
            console.log(
              `    ${index + 1}. ${artist.name} (${artist.upcomingShows} shows)`,
            );
          });
      }
    }
  } catch (error) {
    console.error("Error syncing real artists:", error);
  }
}

async function main() {
  console.log("🎸 MySetlist Data Initialization Script");
  console.log("=====================================\n");

  // Check current status
  const { hasData } = await checkDataStatus();

  if (hasData) {
    console.log("\n✅ App already has data and trending scores!");
    console.log("\n💡 Options:");
    console.log("  1. The trending page should now show data");
    console.log("  2. Search should return results");
    console.log("  3. You can sync more real artists using the script");

    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        "\nDo you want to sync real artists from Ticketmaster? (y/N): ",
        resolve,
      );
    });
    rl.close();

    if (answer.toLowerCase() === "y") {
      await syncRealArtists();
    }
  } else {
    console.log("\n⚠️  No data found. Initializing...");

    const success = await initializeData();

    if (success) {
      console.log("\n🎉 Success! Your app now has:");
      console.log("  ✅ Mock artists, venues, shows, and songs");
      console.log("  ✅ Trending scores calculated");
      console.log("  ✅ Search functionality working");
      console.log("  ✅ Trending page showing data");

      console.log("\n💡 Next steps:");
      console.log("  1. Visit http://localhost:3001 to see the app");
      console.log("  2. Check the trending page for popular content");
      console.log("  3. Try searching for artists");
      console.log("  4. Optionally sync real artists with proper API keys");
    }
  }

  console.log("\n🔧 Manual Commands:");
  console.log("  Initialize all data:");
  console.log(
    `    curl -X POST ${APP_URL}/api/admin/initialize-data${ADMIN_KEY ? ' -H "Authorization: Bearer $ADMIN_API_KEY"' : ""}`,
  );
  console.log("\n  Sync real artists:");
  console.log(`    curl ${APP_URL}/api/artists/sync`);
  console.log("\n  Update trending scores:");
  console.log(
    `    curl -X POST ${APP_URL}/api/admin/calculate-trending${ADMIN_KEY ? ' -H "Authorization: Bearer $ADMIN_API_KEY"' : ""}`,
  );
}

// Run the script
main().catch(console.error);
