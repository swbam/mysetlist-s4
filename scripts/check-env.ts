#!/usr/bin/env tsx
/**
 * Check if all required environment variables are set for sync operations
 */

import { config } from 'dotenv';
config({ path: ['.env.local', '.env'] });

const requiredVars = {
  // Spotify
  SPOTIFY_CLIENT_ID: 'Spotify Client ID',
  SPOTIFY_CLIENT_SECRET: 'Spotify Client Secret',
  NEXT_PUBLIC_SPOTIFY_CLIENT_ID: 'Spotify Client ID (Public)',

  // Ticketmaster
  TICKETMASTER_API_KEY: 'Ticketmaster API Key',

  // Supabase
  SUPABASE_URL: 'Supabase URL',
  SUPABASE_ANON_KEY: 'Supabase Anonymous Key',
  SUPABASE_SERVICE_ROLE_KEY: 'Supabase Service Role Key',
  SUPABASE_JWT_SECRET: 'Supabase JWT Secret',

  // App
  NEXT_PUBLIC_APP_URL: 'Application URL',
  DATABASE_URL: 'Database Connection String',
};

let allPresent = true;
const missing: string[] = [];

for (const [key, _description] of Object.entries(requiredVars)) {
  if (process.env[key]) {
  } else {
    missing.push(key);
    allPresent = false;
  }
}

if (allPresent) {
} else {
  missing.forEach((_v) => );
  process.exit(1);
}

// Optional: Test API connections
if (process.argv.includes('--test-apis')) {
  // Test Spotify
  try {
    const spotifyResponse = await fetch(
      'https://accounts.spotify.com/api/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      }
    );

    if (spotifyResponse.ok) {
    } else {
    }
  } catch (_error) {}

  // Test Ticketmaster
  try {
    const tmResponse = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env.TICKETMASTER_API_KEY}&size=1`
    );

    if (tmResponse.ok) {
    } else {
    }
  } catch (_error) {}
}
