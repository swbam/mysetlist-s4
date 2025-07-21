#!/usr/bin/env tsx
/**
 * Seed database with top 5 US artists with real upcoming shows
 * Uses the existing artist sync infrastructure
 */

import 'dotenv/config';

const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3001';

// Top 5 trending US artists as of 2024
const TOP_ARTISTS = [
  { name: 'Taylor Swift', spotifyId: '06HL4z0CvFAxyc27GXpf02' },
  { name: 'Drake', spotifyId: '3TVXtAsR1Inumwj472S9r4' },
  { name: 'Bad Bunny', spotifyId: '4q3ewBCX7sLwd24euuV69X' },
  { name: 'The Weeknd', spotifyId: '1Xyo4u8uXC1ZmMpatF05PJ' },
  { name: 'Post Malone', spotifyId: '246dkjvS1zLTtiykXe5h60' },
];

async function syncArtist(artist: { name: string; spotifyId: string }) {
  try {
    console.log(`🎤 Syncing ${artist.name}...`);

    // Use the existing artist sync endpoint
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
      const contentType = response.headers.get('content-type');
      let error = '';
      
      if (contentType?.includes('application/json')) {
        const errorJson = await response.json();
        error = errorJson.error || errorJson.message || JSON.stringify(errorJson);
      } else {
        error = `HTTP ${response.status} ${response.statusText}`;
      }
      
      console.error(`❌ Failed to sync ${artist.name}: ${error}`);
      return false;
    }

    const result = await response.json();
    console.log(`✅ ${artist.name} synced successfully (ID: ${result.artist?.id})`);

    // Note: auto-import functionality is handled by the sync endpoint itself
    // via Supabase edge functions for song catalog and shows
    if (result.artist?.ticketmasterId) {
      console.log(`  📅 Shows will be synced from Ticketmaster`);
    }
    console.log(`  🎵 Song catalog will be synced from Spotify`);

    return true;
  } catch (error) {
    console.error(`❌ Failed to sync ${artist.name}:`, error);
    return false;
  }
}

async function initializeTrendingScores() {
  try {
    console.log('\n📊 Initializing trending scores...');
    const response = await fetch(`${APP_URL}/api/admin/init-trending`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Trending scores initialized: ${result.updated} artists updated`);
    } else {
      console.log('⚠️  Failed to initialize trending scores');
    }
  } catch (error) {
    console.error('❌ Error initializing trending scores:', error);
  }
}

async function main() {
  console.log('🚀 Starting real artist sync for top 5 US artists...\n');

  let successCount = 0;

  // Sync each artist
  for (const artist of TOP_ARTISTS) {
    const success = await syncArtist(artist);
    if (success) {
      successCount++;
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log(`\n✅ Synced ${successCount}/${TOP_ARTISTS.length} artists`);

  // Initialize trending scores
  await initializeTrendingScores();

  if (successCount > 0) {
    console.log('\n🎉 Seed complete! You now have real data for:');
    TOP_ARTISTS.forEach(artist => {
      console.log(`  • ${artist.name}`);
    });
    console.log('\n💡 The auto-import will continue running in the background to fetch:');
    console.log('  • Upcoming shows from Ticketmaster');
    console.log('  • Venue information');
    console.log('  • Song catalogs from Spotify');
    console.log('\n🚀 Start the app with: pnpm dev');
  } else {
    console.log('\n❌ Failed to sync any artists. Please check your API keys and try again.');
  }
}

// Run the script
main().catch(console.error);