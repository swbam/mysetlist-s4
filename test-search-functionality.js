#!/usr/bin/env node

/**
 * Test script to verify search functionality returns only artists from Ticketmaster API
 */

const testQuery = "coldplay";
const baseUrl = "http://localhost:3001";

async function testSearchAPI() {
  console.log("🔍 Testing Search API Functionality");
  console.log("=====================================");

  try {
    // Test main search endpoint
    console.log(
      `\n1. Testing main search endpoint: /api/search?q=${testQuery}`,
    );
    const mainSearchUrl = `${baseUrl}/api/search?q=${testQuery}&limit=5`;

    console.log(`Fetching: ${mainSearchUrl}`);
    const mainResponse = await fetch(mainSearchUrl);

    if (!mainResponse.ok) {
      throw new Error(
        `HTTP ${mainResponse.status}: ${mainResponse.statusText}`,
      );
    }

    const mainData = await mainResponse.json();
    console.log("✅ Response received");
    console.log(`📊 Results count: ${mainData.results?.length || 0}`);

    if (mainData.results && mainData.results.length > 0) {
      console.log("\n📋 Sample results:");
      mainData.results.slice(0, 3).forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.name} (${result.type})`);
        console.log(`     Source: ${result.metadata?.source || "unknown"}`);
        console.log(`     Description: ${result.description || "N/A"}`);
      });

      // Verify all results are artists
      const nonArtists = mainData.results.filter(
        (result) => result.type !== "artist",
      );
      if (nonArtists.length > 0) {
        console.log(
          `\n❌ ERROR: Found ${nonArtists.length} non-artist results!`,
        );
        for (const result of nonArtists) {
          console.log(`   - ${result.name} (type: ${result.type})`);
        }
        return false;
      }
      console.log("\n✅ SUCCESS: All results are artists!");
    } else {
      console.log("⚠️  No results found");
    }

    // Test artists-specific endpoint for comparison
    console.log(
      `\n2. Testing artists-specific endpoint: /api/artists/search?q=${testQuery}`,
    );
    const artistsSearchUrl = `${baseUrl}/api/artists/search?q=${testQuery}&limit=5`;

    console.log(`Fetching: ${artistsSearchUrl}`);
    const artistsResponse = await fetch(artistsSearchUrl);

    if (artistsResponse.ok) {
      const artistsData = await artistsResponse.json();
      console.log("✅ Artists endpoint response received");
      console.log(
        `📊 Artists results count: ${artistsData.artists?.length || 0}`,
      );

      if (artistsData.artists && artistsData.artists.length > 0) {
        console.log("\n📋 Sample artist results:");
        artistsData.artists.slice(0, 3).forEach((artist, index) => {
          console.log(`  ${index + 1}. ${artist.name}`);
          console.log(`     Source: ${artist.source || "unknown"}`);
          console.log(`     Genres: ${artist.genres?.join(", ") || "N/A"}`);
        });
      }
    } else {
      console.log(`⚠️  Artists endpoint failed: ${artistsResponse.status}`);
    }

    console.log("\n🎉 Search functionality test completed!");
    return true;
  } catch (error) {
    console.error("\n❌ Test failed with error:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.log(
        "\n💡 Tip: Make sure the development server is running on port 3001",
      );
      console.log("   Run: pnpm dev");
    }

    return false;
  }
}

// Run the test
testSearchAPI().then((success) => {
  process.exit(success ? 0 : 1);
});
