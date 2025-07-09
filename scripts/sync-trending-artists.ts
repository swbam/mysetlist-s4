#!/usr/bin/env tsx
/**
 * Script to sync trending artists with upcoming shows in the US
 * This fetches real data from Ticketmaster and Spotify APIs
 */

import 'dotenv/config';
import { TicketmasterClient } from '../packages/external-apis/src/clients/ticketmaster';
import { SpotifyClient } from '../packages/external-apis/src/clients/spotify';

// API configuration - these should be in your .env file
const requiredEnvVars = [
  'TICKETMASTER_API_KEY',
  'NEXT_PUBLIC_SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'NEXT_PUBLIC_APP_URL',
];

// Check for required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface TrendingArtist {
  name: string;
  ticketmasterId: string;
  spotifyId?: string;
  upcomingShows: number;
  imageUrl?: string;
  genres?: string[];
}

async function getTrendingArtistsFromTicketmaster(): Promise<TrendingArtist[]> {
  console.log('🎫 Fetching trending artists from Ticketmaster...');

  const tmClient = new TicketmasterClient({});
  const trendingArtists: TrendingArtist[] = [];

  try {
    // Get music events in the US sorted by popularity
    const eventsResponse = await tmClient.searchEvents({
      countryCode: 'US',
      classificationName: 'Music',
      size: 200, // Get more events to find unique artists
      sort: 'relevance,desc',
      startDateTime: new Date().toISOString().split('.')[0] + 'Z',
      endDateTime:
        new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('.')[0] + 'Z', // Next 6 months
    });

    if (!eventsResponse._embedded?.events) {
      console.warn('No events found from Ticketmaster');
      return [];
    }

    // Extract unique artists from events
    const artistMap = new Map<string, TrendingArtist>();

    for (const event of eventsResponse._embedded.events) {
      if (!event._embedded?.attractions) continue;

      for (const attraction of event._embedded.attractions) {
        if (
          attraction.type?.toLowerCase() !== 'artist' &&
          attraction.classifications?.[0]?.segment?.name !== 'Music'
        ) {
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
        }
      }
    }

    // Sort by number of upcoming shows and take top artists
    const sortedArtists = Array.from(artistMap.values())
      .sort((a, b) => b.upcomingShows - a.upcomingShows)
      .slice(0, 15); // Get top 15 to ensure we have at least 10 after Spotify matching

    console.log(`Found ${sortedArtists.length} artists with upcoming shows`);

    // Match with Spotify to get additional data
    for (const artist of sortedArtists) {
      try {
        console.log(`🔍 Looking up "${artist.name}" on Spotify...`);
        const spotifyResults = await spotify.searchArtists(artist.name, 1);

        if (spotifyResults.length > 0) {
          const spotifyArtist = spotifyResults[0];
          artist.spotifyId = spotifyArtist.id;
          artist.genres = spotifyArtist.genres;
          if (!artist.imageUrl && spotifyArtist.images.length > 0) {
            artist.imageUrl = spotifyArtist.images[0].url;
          }
        }
      } catch (error) {
        console.warn(`Failed to find Spotify data for ${artist.name}:`, error);
      }
    }

    // Filter to only artists with Spotify IDs and take top 10
    const artistsWithSpotify = sortedArtists
      .filter((a) => a.spotifyId)
      .slice(0, 10);

    return artistsWithSpotify;
  } catch (error) {
    console.error('Error fetching from Ticketmaster:', error);
    throw error;
  }
}

async function syncArtist(artist: TrendingArtist): Promise<boolean> {
  try {
    console.log(`\n🔄 Syncing ${artist.name}...`);

    const response = await fetch(`${APP_URL}/api/artists/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spotifyId: artist.spotifyId,
        artistName: artist.name,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to sync ${artist.name}:`, error);
      return false;
    }

    const result = await response.json();
    console.log(
      `✅ Successfully synced ${artist.name} (ID: ${result.artist.id})`
    );
    console.log(`   - Genres: ${result.artist.genres.join(', ') || 'None'}`);
    console.log(`   - Popularity: ${result.artist.popularity}/100`);
    console.log(`   - Followers: ${result.artist.followers.toLocaleString()}`);
    console.log(`   - Upcoming shows: ${artist.upcomingShows}`);

    return true;
  } catch (error) {
    console.error(`❌ Error syncing ${artist.name}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting trending artists sync...\n');
  console.log(`Using API endpoint: ${APP_URL}/api/artists/sync`);

  try {
    // Get trending artists
    const trendingArtists = await getTrendingArtistsFromTicketmaster();

    if (trendingArtists.length === 0) {
      console.error('❌ No trending artists found');
      process.exit(1);
    }

    console.log(
      `\n📊 Found ${trendingArtists.length} trending artists with Spotify data:`
    );
    trendingArtists.forEach((artist, index) => {
      console.log(
        `${index + 1}. ${artist.name} - ${artist.upcomingShows} upcoming shows`
      );
    });

    // Sync each artist
    console.log('\n🔄 Starting sync process...');
    let successCount = 0;

    for (const artist of trendingArtists) {
      const success = await syncArtist(artist);
      if (success) successCount++;

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(
      `\n✨ Sync complete! Successfully synced ${successCount}/${trendingArtists.length} artists`
    );

    // Note about background jobs
    console.log(
      '\n📝 Note: Song catalogs and show details are being synced in the background via Supabase Edge Functions'
    );
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
