#!/usr/bin/env tsx

import "dotenv/config";
import { SpotifyClient, TicketmasterClient } from "@repo/external-apis";

async function testWorkingSync() {
  console.log("🔄 Testing working sync with proper API configuration...");

  try {
    // Initialize clients with proper API keys
    const tmClient = new TicketmasterClient({
      apiKey: process.env.TICKETMASTER_API_KEY,
    });

    const spotify = new SpotifyClient({
      clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });

    console.log("✅ Clients initialized with API keys");

    // Test Ticketmaster API
    console.log("\n📍 Getting current music events...");
    const events = await tmClient.searchEvents({
      countryCode: "US",
      classificationName: "Music",
      size: 10,
    });

    console.log(`Found ${events._embedded?.events?.length || 0} music events`);

    if (!events._embedded?.events?.length) {
      console.log("❌ No events found - cannot test attraction sync");
      return;
    }

    // Find an event with attractions
    let attractionId = null;
    let attractionName = null;

    for (const event of events._embedded.events) {
      if (event._embedded?.attractions?.[0]) {
        attractionId = event._embedded.attractions[0].id;
        attractionName = event._embedded.attractions[0].name;
        console.log(
          `✅ Found attraction: ${attractionName} (ID: ${attractionId})`,
        );
        break;
      }
    }

    if (!attractionId) {
      console.log("❌ No attractions found in events");
      return;
    }

    // Test getting attraction details
    console.log(`\n🎤 Getting attraction details for ${attractionName}...`);
    const attraction = await tmClient.getAttraction(attractionId);
    console.log(`✅ Fetched attraction details: ${attraction.name}`);

    // Test Spotify search
    console.log(`\n🎵 Searching Spotify for "${attractionName}"...`);
    await spotify.authenticate();
    const spotifyResults = await spotify.searchArtists(attractionName, 1);

    if (spotifyResults.artists.items.length > 0) {
      const spotifyArtist = spotifyResults.artists.items[0];
      console.log(`✅ Found on Spotify: ${spotifyArtist.name}`);
      console.log(`   - Popularity: ${spotifyArtist.popularity}`);
      console.log(
        `   - Followers: ${spotifyArtist.followers.total.toLocaleString()}`,
      );
      console.log(`   - Genres: ${spotifyArtist.genres.join(", ")}`);
    } else {
      console.log(`⚠️  "${attractionName}" not found on Spotify`);
    }

    console.log("\n🎉 External APIs are working correctly!");
    console.log(
      `💡 Ready to sync real data with attraction ID: ${attractionId}`,
    );

    return {
      success: true,
      sampleAttractionId: attractionId,
      attractionName: attractionName,
    };
  } catch (error) {
    console.error("❌ Sync test failed:", error);
    return { success: false, error: error.message };
  }
}

testWorkingSync()
  .then((result) => {
    if (result?.success) {
      console.log("\n✅ All systems operational - ready for database sync!");
    } else {
      console.log("\n❌ Sync test failed");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("💥 Test crashed:", error);
    process.exit(1);
  });
