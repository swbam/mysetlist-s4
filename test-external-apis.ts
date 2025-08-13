#!/usr/bin/env tsx

import "dotenv/config";
import { SpotifyClient, TicketmasterClient } from "@repo/external-apis";

async function testExternalAPIs() {
  console.log("🧪 Testing external API connections...");

  // Test Ticketmaster API
  try {
    console.log("\n📍 Testing Ticketmaster API...");
    const tmClient = new TicketmasterClient({
      apiKey: process.env.TICKETMASTER_API_KEY,
    });

    // Search for current music events
    const events = await tmClient.searchEvents({
      countryCode: "US",
      classificationName: "Music",
      size: 5,
    });

    console.log("✅ Ticketmaster API working!");
    console.log(`Found ${events._embedded?.events?.length || 0} events`);

    if (events._embedded?.events?.length) {
      const event = events._embedded.events[0];
      console.log(`Sample event: ${event.name}`);

      // Test getting attraction data
      if (event._embedded?.attractions?.[0]) {
        const attractionId = event._embedded.attractions[0].id;
        console.log(`Testing attraction fetch for ID: ${attractionId}`);

        const attraction = await tmClient.getAttraction(attractionId);
        console.log(`✅ Fetched attraction: ${attraction.name}`);

        return {
          success: true,
          sampleTmId: attractionId,
          attractionName: attraction.name,
        };
      }
    }
  } catch (error) {
    console.error("❌ Ticketmaster API failed:");
    console.error(error);
    return { success: false, error: error.message };
  }

  // Test Spotify API
  try {
    console.log("\n🎵 Testing Spotify API...");
    const spotify = new SpotifyClient({
      clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });

    await spotify.authenticate();
    console.log("✅ Spotify authentication successful!");

    // Search for a popular artist
    const results = await spotify.searchArtists("Taylor Swift", 1);
    if (results.artists.items.length > 0) {
      const artist = results.artists.items[0];
      console.log(
        `✅ Found artist: ${artist.name} (${artist.followers.total} followers)`,
      );
    }

    console.log("✅ Spotify API working!");
  } catch (error) {
    console.error("❌ Spotify API failed:");
    console.error(error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Run test
testExternalAPIs()
  .then((result) => {
    if (result.success) {
      console.log("\n🎉 All external APIs are working correctly!");

      if (result.sampleTmId) {
        console.log(
          `\n💡 You can test the sync pipeline with: tsx test-sync-pipeline.ts ${result.sampleTmId}`,
        );
      }
    } else {
      console.log("\n💥 External API test failed!");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("💥 Test crashed:", error);
    process.exit(1);
  });
