#!/usr/bin/env tsx
/**
 * Script to sync trending artists with upcoming shows in the US
 * This fetches real data from Ticketmaster and Spotify APIs
 */

import "dotenv/config"
import { TicketmasterClient } from "../packages/external-apis/src/clients/ticketmaster"

// API configuration - these should be in your .env file
const requiredEnvVars = [
  "TICKETMASTER_API_KEY",
  "NEXT_PUBLIC_SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "NEXT_PUBLIC_APP_URL",
]

// Check for required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    process.exit(1)
  }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"

interface TrendingArtist {
  name: string
  ticketmasterId: string
  spotifyId?: string
  upcomingShows: number
  imageUrl?: string
  genres?: string[]
}

async function getTrendingArtistsFromTicketmaster(): Promise<TrendingArtist[]> {
  const tmClient = new TicketmasterClient({})
  const _trendingArtists: TrendingArtist[] = []
  // Get music events in the US sorted by popularity
  const eventsResponse = await tmClient.searchEvents({
    countryCode: "US",
    classificationName: "Music",
    size: 200, // Get more events to find unique artists
    sort: "relevance,desc",
    startDateTime: `${new Date().toISOString().split(".")[0]}Z`,
    endDateTime: `${
      new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split(".")[0]
    }Z`, // Next 6 months
  })

  if (!eventsResponse._embedded?.events) {
    return []
  }

  // Extract unique artists from events
  const artistMap = new Map<string, TrendingArtist>()

  for (const event of eventsResponse._embedded.events) {
    if (!event._embedded?.attractions) {
      continue
    }

    for (const attraction of event._embedded.attractions) {
      if (
        attraction.type?.toLowerCase() !== "artist" &&
        attraction.classifications?.[0]?.segment?.name !== "Music"
      ) {
        continue
      }

      if (artistMap.has(attraction.id)) {
        const artist = artistMap.get(attraction.id)!
        artist.upcomingShows++
      } else {
        artistMap.set(attraction.id, {
          name: attraction.name,
          ticketmasterId: attraction.id,
          upcomingShows: 1,
          imageUrl: attraction.images?.[0]?.url,
        })
      }
    }
  }

  // Sort by number of upcoming shows and take top artists
  const sortedArtists = Array.from(artistMap.values())
    .sort((a, b) => b.upcomingShows - a.upcomingShows)
    .slice(0, 15) // Get top 15 to ensure we have at least 10 after Spotify matching

  // Match with Spotify to get additional data
  for (const artist of sortedArtists) {
    try {
      const spotifyResults = await spotify.searchArtists(artist.name, 1)

      if (spotifyResults.length > 0) {
        const spotifyArtist = spotifyResults[0]
        artist.spotifyId = spotifyArtist.id
        artist.genres = spotifyArtist.genres
        if (!artist.imageUrl && spotifyArtist.images.length > 0) {
          artist.imageUrl = spotifyArtist.images[0].url
        }
      }
    } catch (_error) {}
  }

  // Filter to only artists with Spotify IDs and take top 10
  const artistsWithSpotify = sortedArtists
    .filter((a) => a.spotifyId)
    .slice(0, 10)

  return artistsWithSpotify
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
        artistName: artist.name,
      }),
    })

    if (!response.ok) {
      const _error = await response.text()
      return false
    }

    const _result = await response.json()

    return true
  } catch (_error) {
    return false
  }
}

async function main() {
  try {
    // Get trending artists
    const trendingArtists = await getTrendingArtistsFromTicketmaster()

    if (trendingArtists.length === 0) {
      process.exit(1)
    }
    trendingArtists.forEach((_artist, _index) => {})
    let _successCount = 0

    for (const artist of trendingArtists) {
      const success = await syncArtist(artist)
      if (success) {
        _successCount++
      }

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  } catch (_error) {
    process.exit(1)
  }
}

// Run the script
main().catch(console.error)
