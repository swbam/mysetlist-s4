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

console.log('🔍 Checking environment variables for MySetlist sync...\n');

let allPresent = true;
const missing: string[] = [];

for (const [key, description] of Object.entries(requiredVars)) {
  if (process.env[key]) {
    console.log(`✅ ${key} - ${description}`);
  } else {
    console.log(`❌ ${key} - ${description} (MISSING)`);
    missing.push(key);
    allPresent = false;
  }
}

console.log('\n' + '='.repeat(60) + '\n');

if (allPresent) {
  console.log('✅ All required environment variables are set!');
  console.log('\nYou can now run:');
  console.log('  pnpm sync:artists    - Sync trending artists');
  console.log('  pnpm test:e2e        - Run comprehensive tests');
  console.log('  pnpm allofit         - Run full sync and test');
} else {
  console.log('❌ Missing environment variables:');
  missing.forEach((v) => console.log(`  - ${v}`));
  console.log(
    '\nPlease add these to your .env file before running sync operations.'
  );
  console.log('\nFor more information, see: docs/SYNC_SYSTEM.md');
  process.exit(1);
}

// Optional: Test API connections
if (process.argv.includes('--test-apis')) {
  console.log('\n🧪 Testing API connections...\n');

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
      console.log('✅ Spotify API connection successful');
    } else {
      console.log('❌ Spotify API connection failed:', spotifyResponse.status);
    }
  } catch (error) {
    console.log('❌ Spotify API connection error:', error);
  }

  // Test Ticketmaster
  try {
    const tmResponse = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env.TICKETMASTER_API_KEY}&size=1`
    );

    if (tmResponse.ok) {
      console.log('✅ Ticketmaster API connection successful');
    } else {
      console.log('❌ Ticketmaster API connection failed:', tmResponse.status);
    }
  } catch (error) {
    console.log('❌ Ticketmaster API connection error:', error);
  }
}
