#!/usr/bin/env node

/**
 * Test script for the complete data import orchestration pipeline
 * Tests: Artist → Songs → Shows → Setlists data flow
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Test configuration
const TEST_CONFIG = {
  BASE_URL: 'http://localhost:3001',
  CRON_SECRET: process.env.CRON_SECRET,
  // Test artists (well-known artists that should have good data)
  TEST_ARTISTS: [
    { name: 'Arctic Monkeys', spotifyId: '7Ln80lUS6He07XvHI8qqHH' },
    { name: 'The Strokes', spotifyId: '0epOFNiUfyON9EYx7Tpr6V' },
    { name: 'Tame Impala', spotifyId: '5INjqkS1o8h1imAzPqGZBb' },
    { name: 'Radiohead', spotifyId: '4Z8W4fKeB5YxbusRsdQVPb' }
  ]
};

async function makeRequest(endpoint, options = {}) {
  const url = `${TEST_CONFIG.BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(TEST_CONFIG.CRON_SECRET && {
      'Authorization': `Bearer ${TEST_CONFIG.CRON_SECRET}`
    }),
    ...options.headers
  };

  console.log(`\n🔄 Making request to: ${endpoint}`);
  
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      ...(options.body && { body: JSON.stringify(options.body) })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Request failed (${response.status}):`, data);
      return { success: false, error: data, status: response.status };
    }

    console.log(`✅ Request successful (${response.status})`);
    return { success: true, data, status: response.status };
  } catch (error) {
    console.error(`❌ Request error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function testOrchestrationPipeline(artist) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎵 Testing complete pipeline for: ${artist.name}`);
  console.log(`   Spotify ID: ${artist.spotifyId}`);
  console.log(`${'='.repeat(60)}`);

  // Test the orchestration endpoint
  const result = await makeRequest('/api/sync/orchestration', {
    method: 'POST',
    body: {
      spotifyId: artist.spotifyId,
      options: {
        syncSongs: true,
        syncShows: true,
        createDefaultSetlists: true,
        fullDiscography: true
      }
    }
  });

  if (!result.success) {
    console.error(`❌ Orchestration failed for ${artist.name}`);
    return false;
  }

  const { data } = result;
  console.log(`\n📊 Pipeline Results for ${artist.name}:`);
  console.log(`   Success: ${data.success}`);
  console.log(`   Completed Steps: ${data.summary?.completed}/${data.summary?.totalSteps}`);
  console.log(`   Success Rate: ${data.summary?.successRate}`);

  // Print step details
  if (data.steps) {
    console.log(`\n📋 Step Details:`);
    data.steps.forEach((step, index) => {
      const status = step.status === 'completed' ? '✅' : 
                    step.status === 'failed' ? '❌' : 
                    step.status === 'running' ? '🔄' : '⏳';
      console.log(`   ${status} ${step.step}`);
      
      if (step.result && typeof step.result === 'object') {
        if (step.result.totalSongs || step.result.totalAlbums) {
          console.log(`      → ${step.result.totalSongs} songs from ${step.result.totalAlbums} albums`);
        }
        if (step.result.upcomingShows) {
          console.log(`      → ${step.result.upcomingShows} upcoming shows, ${step.result.created || 0} created`);
        }
        if (step.result.createdSetlists) {
          console.log(`      → ${step.result.createdSetlists} setlists created for ${step.result.upcomingShows} shows`);
        }
      }
      
      if (step.error) {
        console.log(`      ❌ Error: ${step.error}`);
      }
    });
  }

  return data.success;
}

async function verifyDataIntegrity(artist) {
  console.log(`\n🔍 Verifying data integrity for ${artist.name}...`);

  // Check if artist exists in database
  const artistCheck = await makeRequest(`/api/artists/search?q=${encodeURIComponent(artist.name)}&limit=1`);
  if (!artistCheck.success || !artistCheck.data?.artists?.length) {
    console.error(`❌ Artist not found in database: ${artist.name}`);
    return false;
  }

  const dbArtist = artistCheck.data.artists[0];
  console.log(`✅ Artist found: ${dbArtist.name} (ID: ${dbArtist.id})`);
  
  // Check songs
  const songsCheck = await makeRequest(`/api/artists/${dbArtist.id}/songs`);
  if (songsCheck.success && songsCheck.data?.songs) {
    console.log(`✅ Songs: ${songsCheck.data.songs.length} songs in catalog`);
  } else {
    console.log(`⚠️  No songs found or error fetching songs`);
  }

  // Check shows
  const showsCheck = await makeRequest(`/api/shows?artistId=${dbArtist.id}&limit=5`);
  if (showsCheck.success && showsCheck.data?.shows) {
    console.log(`✅ Shows: ${showsCheck.data.shows.length} shows found`);
    
    // Check setlists for first show if any
    if (showsCheck.data.shows.length > 0) {
      const firstShow = showsCheck.data.shows[0];
      const setlistsCheck = await makeRequest(`/api/setlists?showId=${firstShow.id}`);
      if (setlistsCheck.success && setlistsCheck.data?.setlists) {
        console.log(`✅ Setlists: ${setlistsCheck.data.setlists.length} setlists for "${firstShow.name}"`);
      }
    }
  } else {
    console.log(`⚠️  No shows found or error fetching shows`);
  }

  return true;
}

async function testHealthCheck() {
  console.log(`\n🏥 Testing API health...`);
  
  const health = await makeRequest('/api/health');
  if (!health.success) {
    console.error(`❌ Health check failed`);
    return false;
  }

  console.log(`✅ API is healthy`);
  return true;
}

async function runTests() {
  console.log(`\n🚀 MySetlist Orchestration Pipeline Test`);
  console.log(`Base URL: ${TEST_CONFIG.BASE_URL}`);
  console.log(`Auth: ${TEST_CONFIG.CRON_SECRET ? 'Configured' : 'Not configured'}`);

  // Health check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.error(`❌ Cannot proceed - API health check failed`);
    process.exit(1);
  }

  // Ask user which artist to test
  console.log(`\n📋 Available test artists:`);
  TEST_CONFIG.TEST_ARTISTS.forEach((artist, index) => {
    console.log(`   ${index + 1}. ${artist.name}`);
  });

  const answer = await new Promise(resolve => {
    rl.question('\n🎯 Enter artist number to test (1-4) or press Enter for Arctic Monkeys: ', resolve);
  });

  const artistIndex = answer ? parseInt(answer) - 1 : 0;
  const selectedArtist = TEST_CONFIG.TEST_ARTISTS[artistIndex] || TEST_CONFIG.TEST_ARTISTS[0];

  if (!selectedArtist) {
    console.error(`❌ Invalid artist selection`);
    process.exit(1);
  }

  // Run the test
  console.log(`\n🎸 Testing with: ${selectedArtist.name}`);
  
  const startTime = Date.now();
  const success = await testOrchestrationPipeline(selectedArtist);
  const duration = Date.now() - startTime;

  if (success) {
    console.log(`\n🎉 Pipeline test completed successfully in ${duration}ms`);
    
    // Verify data integrity
    await verifyDataIntegrity(selectedArtist);
    
    console.log(`\n✅ All tests completed! Data pipeline is working correctly.`);
  } else {
    console.log(`\n❌ Pipeline test failed after ${duration}ms`);
    console.log(`\n🔧 Check the API logs and ensure all external API credentials are configured.`);
  }

  rl.close();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n👋 Test interrupted by user`);
  rl.close();
  process.exit(0);
});

// Run tests
runTests().catch(error => {
  console.error(`\n💥 Unexpected error:`, error);
  rl.close();
  process.exit(1);
});