#!/usr/bin/env tsx

import { resolve } from "path";
import { config } from "dotenv";

// Load environment variables
config({ path: resolve(__dirname, "../.env.local") });

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

async function initializeTrendingData() {
  console.log("🚀 Initializing trending data...\n");

  // Check required environment variables
  if (!CRON_SECRET) {
    console.error("❌ Error: CRON_SECRET environment variable is not set");
    console.error("Please add CRON_SECRET to your .env.local file");
    process.exit(1);
  }

  if (!ADMIN_API_KEY) {
    console.error("❌ Error: ADMIN_API_KEY environment variable is not set");
    console.error("Please add ADMIN_API_KEY to your .env.local file");
    process.exit(1);
  }

  try {
    // Step 1: Seed initial trending data
    console.log("1️⃣ Seeding initial trending data...");
    const seedResponse = await fetch(
      `${BASE_URL}/api/admin/seed-trending?type=all`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ADMIN_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!seedResponse.ok) {
      const error = await seedResponse.text();
      throw new Error(`Failed to seed trending data: ${error}`);
    }

    const seedResult = await seedResponse.json();
    console.log("✅ Seeded trending data:", seedResult.results);

    // Step 2: Trigger master sync to update artist/show data
    console.log("\n2️⃣ Triggering master sync...");
    const syncResponse = await fetch(
      `${BASE_URL}/api/cron/master-sync?mode=daily`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!syncResponse.ok) {
      const error = await syncResponse.text();
      console.warn("⚠️ Warning: Master sync failed:", error);
    } else {
      const syncResult = await syncResponse.json();
      console.log("✅ Master sync completed:", {
        artistsUpdated: syncResult.summary?.artistsUpdated || 0,
        showsCreated: syncResult.summary?.showsCreated || 0,
      });
    }

    // Step 3: Calculate trending scores
    console.log("\n3️⃣ Calculating trending scores...");
    const trendingResponse = await fetch(
      `${BASE_URL}/api/cron/calculate-trending?mode=daily&type=all`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!trendingResponse.ok) {
      const error = await trendingResponse.text();
      throw new Error(`Failed to calculate trending: ${error}`);
    }

    const trendingResult = await trendingResponse.json();
    console.log("✅ Calculated trending scores:", {
      artists: trendingResult.results?.artists?.updated || 0,
      shows: trendingResult.results?.shows?.updated || 0,
      topArtist: trendingResult.results?.trending?.topArtist || "None",
      topShow: trendingResult.results?.trending?.topShow || "None",
    });

    // Step 4: Verify trending data exists
    console.log("\n4️⃣ Verifying trending data...");
    const verifyResponse = await fetch(
      `${BASE_URL}/api/trending/artists?limit=5`,
    );

    if (verifyResponse.ok) {
      const verifyResult = await verifyResponse.json();
      console.log(
        "✅ Trending artists found:",
        verifyResult.artists?.length || 0,
      );

      if (verifyResult.artists?.length > 0) {
        console.log("\n📊 Top 5 Trending Artists:");
        verifyResult.artists
          .slice(0, 5)
          .forEach((artist: any, index: number) => {
            console.log(
              `${index + 1}. ${artist.name} - Score: ${artist.trendingScore?.toFixed(2) || 0}`,
            );
          });
      }
    }

    console.log("\n✨ Trending data initialization complete!");
    console.log("\n📝 Next steps:");
    console.log(
      "1. Visit http://localhost:3001/trending to see the trending page",
    );
    console.log("2. The cron job will run daily to update trending scores");
    console.log("3. To manually trigger updates, use: pnpm trigger:trending");
  } catch (error) {
    console.error("\n❌ Error initializing trending data:", error);
    process.exit(1);
  }
}

// Run the initialization
initializeTrendingData();
