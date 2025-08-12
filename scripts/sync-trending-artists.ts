#!/usr/bin/env tsx
/**
 * Script to sync trending artists with upcoming shows in the US
 * This fetches real data from Ticketmaster and Spotify APIs
 */

import "dotenv/config";
import { SpotifyClient } from "../packages/external-apis/src/clients/spotify";
import { TicketmasterClient } from "../packages/external-apis/src/clients/ticketmaster";

// API configuration - these should be in your .env file
const requiredEnvVars = [
  "TICKETMASTER_API_KEY",
  "NEXT_PUBLIC_SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "NEXT_PUBLIC_APP_URL",
];

// Check for required environment variables
console.log("🔍 Checking required environment variables...");
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    console.error("Please ensure all API keys are configured in .env.local");
    process.exit(1);
  }
}
console.log("✅ All required environment variables are set");

const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3001";

// Create Spotify client instance
const spotify = new SpotifyClient({
  apiKey: process.env.SPOTIFY_CLIENT_ID!, // Not used, but required by interface
});

interface TrendingArtist {
  name: string;
  ticketmasterId: string;
  spotifyId?: string;
  upcomingShows: number;
  imageUrl?: string;
  genres?: string[];
}

async function getTrendingArtistsFromTicketmaster(): Promise<TrendingArtist[]> {
  const tmClient = new TicketmasterClient({
    apiKey: process.env.TICKETMASTER_API_KEY!,
  });
  const _trendingArtists: TrendingArtist[] = [];
  // Get music events in the US sorted by popularity
  console.log("🔍 Searching for music events...");
  const eventsResponse = await tmClient.searchEvents({
    countryCode: "US",
    classificationName: "Music",
    size: 50, // Reduce size to avoid timeout
    sort: "relevance,desc",
    startDateTime: `${new Date().toISOString().split(".")[0]}Z`,
    endDateTime: `${
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split(".")[0]
    }Z`, // Next 3 months instead of 6
  });
  
  console.log(`📊 Ticketmaster API returned ${eventsResponse._embedded?.events?.length || 0} events`);

  if (!eventsResponse._embedded?.events) {
    return [];
  }

  // Extract unique artists from events
  const artistMap = new Map<string, TrendingArtist>();
  let processedEvents = 0;
  let processedAttractions = 0;

  for (const event of eventsResponse._embedded.events) {
    processedEvents++;
    if (!event._embedded?.attractions) {
      console.log(`  Event ${processedEvents}: No attractions found`);
      continue;
    }

    for (const attraction of event._embedded.attractions) {
      processedAttractions++;
      
      // More lenient filtering - check if it's an artist OR has Music classification
      const isArtist = attraction.type?.toLowerCase() === "artist";
      const isMusicClassification = attraction.classifications?.some(
        (c: any) => c.segment?.name === "Music"
      );
      
      if (!isArtist && !isMusicClassification) {
        console.log(`    Skipping ${attraction.name}: type=${attraction.type}, not music`);
        continue;
      }

      if (artistMap.has(attraction.id)) {
        const artist = artistMap.get(attraction.id)!;
        artist.upcomingShows++;
      } else {
        artistMap.set(attraction.id, {
          name: attraction.name,
          ticketmasterId: attraction.id,
          upcomingShows: 1,
          imageUrl: attraction.images?.[0]?.url,
        });
        console.log(`    Added artist: ${attraction.name} (${attraction.id})`);
      }
    }
  }
  
  console.log(`🔍 Processed ${processedEvents} events with ${processedAttractions} attractions`);
  console.log(`🎤 Found ${artistMap.size} unique artists`);

  // Sort by number of upcoming shows and take top artists
  const sortedArtists = Array.from(artistMap.values())
    .sort((a, b) => b.upcomingShows - a.upcomingShows)
    .slice(0, 15); // Get top 15 to ensure we have at least 10 after Spotify matching

  // Match with Spotify to get additional data
  console.log("🎵 Authenticating with Spotify...");
  await spotify.authenticate();
  console.log("✅ Spotify authentication successful");

  for (const artist of sortedArtists) {
    console.log(`🔍 Searching Spotify for: ${artist.name}`);
    try {
      const spotifyResults = await spotify.searchArtists(artist.name, 1);

      if (spotifyResults.artists?.items?.length > 0) {
        const spotifyArtist = spotifyResults.artists.items[0];
        artist.spotifyId = spotifyArtist.id;
        artist.genres = spotifyArtist.genres;
        if (!artist.imageUrl && spotifyArtist.images?.length > 0) {
          artist.imageUrl = spotifyArtist.images[0].url;
        }
        console.log(`  ✅ Found on Spotify: ${spotifyArtist.name} (${spotifyArtist.id})`);
      } else {
        console.log(`  ❌ Not found on Spotify: ${artist.name}`);
      }
    } catch (error) {
      console.log(`  ⚠️ Spotify search error for ${artist.name}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Filter to only artists with Spotify IDs and take top 10
  const artistsWithSpotify = sortedArtists
    .filter((a) => a.spotifyId)
    .slice(0, 10);

  console.log(`🎯 Final result: ${artistsWithSpotify.length} artists with Spotify data`);
  artistsWithSpotify.forEach((artist, index) => {
    console.log(`  ${index + 1}. ${artist.name} - ${artist.upcomingShows} shows - Spotify: ${artist.spotifyId}`);
  });

  return artistsWithSpotify;
}

async function syncArtist(artist: TrendingArtist): Promise<boolean> {
  try {
    const response = await fetch(`${APP_URL}/api/artists/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        spotifyId: artist.spotifyId,
        ticketmasterId: artist.ticketmasterId,
        artistName: artist.name,
      }),
    });

    if (!response.ok) {
      const _error = await response.text();
      return false;
    }

    const _result = await response.json();

    return true;
  } catch (_error) {
    return false;
  }
}

async function main() {
  try {
    console.log("🎯 Starting trending artists sync...");
    
    // Get trending artists
    console.log("📡 Fetching trending artists from Ticketmaster...");
    const trendingArtists = await getTrendingArtistsFromTicketmaster();

    if (trendingArtists.length === 0) {
      console.error("❌ No trending artists found");
      process.exit(1);
    }
    
    console.log(`✅ Found ${trendingArtists.length} trending artists`);
    
    trendingArtists.forEach((artist, index) => {
      console.log(`  ${index + 1}. ${artist.name} - ${artist.upcomingShows} shows - Spotify ID: ${artist.spotifyId || 'None'}`);
    });
    
    let successCount = 0;

    console.log("\n🔄 Starting sync process...");
    for (const artist of trendingArtists) {
      console.log(`\n🎤 Syncing ${artist.name}...`);
      const success = await syncArtist(artist);
      if (success) {
        successCount++;
        console.log(`✅ Successfully synced ${artist.name}`);
      } else {
        console.log(`❌ Failed to sync ${artist.name}`);
      }

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    
    console.log(`\n🎉 Sync completed! Successfully synced ${successCount}/${trendingArtists.length} artists`);
    
  } catch (error) {
    console.error("💥 Fatal error in main sync:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace');
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
