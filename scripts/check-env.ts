#!/usr/bin/env tsx
/**
 * Check if all required environment variables are set for sync operations
 */

import { config } from "dotenv"
config({ path: [".env.local", ".env"] })

const requiredVars = {
  // Spotify
  SPOTIFY_CLIENT_ID: "Spotify Client ID",
  SPOTIFY_CLIENT_SECRET: "Spotify Client Secret",
  NEXT_PUBLIC_SPOTIFY_CLIENT_ID: "Spotify Client ID (Public)",

  // Ticketmaster
  TICKETMASTER_API_KEY: "Ticketmaster API Key",

  // Supabase
  SUPABASE_URL: "Supabase URL",
  SUPABASE_ANON_KEY: "Supabase Anonymous Key",
  SUPABASE_SERVICE_ROLE_KEY: "Supabase Service Role Key",
  SUPABASE_JWT_SECRET: "Supabase JWT Secret",

  // App
  NEXT_PUBLIC_APP_URL: "Application URL",
  DATABASE_URL: "Database Connection String",
}

let allPresent = true
const missing: string[] = []

for (const [key, description] of Object.entries(requiredVars)) {
  if (process.env[key]) {
    console.log(`✅ ${description}: Found`)
  } else {
    console.log(`❌ ${description}: Missing`)
    missing.push(key)
    allPresent = false
  }
}

if (allPresent) {
  console.log("✅ All required environment variables are present")
} else {
  console.log("❌ Missing environment variables:")
  missing.forEach((v) => console.log(`  - ${v}`))
  process.exit(1)
}

// Main function to run checks
async function main() {
  // Optional: Test API connections
  if (process.argv.includes("--test-apis")) {
    console.log("🔍 Testing API connections...")

    // Test Spotify
    try {
      const spotifyResponse = await fetch(
        "https://accounts.spotify.com/api/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString("base64")}`,
          },
          body: "grant_type=client_credentials",
        }
      )

      if (spotifyResponse.ok) {
        console.log("✅ Spotify API: Connected")
      } else {
        console.log("❌ Spotify API: Failed")
      }
    } catch (error) {
      console.log("❌ Spotify API: Error -", error)
    }

    // Test Ticketmaster
    try {
      const tmResponse = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env.TICKETMASTER_API_KEY}&size=1`
      )

      if (tmResponse.ok) {
        console.log("✅ Ticketmaster API: Connected")
      } else {
        console.log("❌ Ticketmaster API: Failed")
      }
    } catch (error) {
      console.log("❌ Ticketmaster API: Error -", error)
    }
  }
}

// Run the main function
main().catch(console.error)
