#!/usr/bin/env node

/**
 * Comprehensive MySetlist Data Sync Test
 * Tests the complete data pipeline: artist sync, show sync, and trending functionality
 */

const API_BASE = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

console.log('🚀 MySetlist Data Sync Comprehensive Test');
console.log(`📍 Testing against: ${API_BASE}`);
console.log('=' + '='.repeat(50));

/**
 * Test the API health and database connectivity
 */
async function testHealth() {
  console.log('\n🏥 Testing API Health...');
  try {
    const response = await fetch(`${API_BASE}/api/health/comprehensive`);
    const data = await response.json();
    
    if (data.status === 'healthy') {
      console.log('✅ API is healthy');
      console.log(`  - Database: ${data.database.status}`);
      console.log(`  - External APIs: ${data.externalApis ? 'configured' : 'not configured'}`);
      return true;
    } else {
      console.log('❌ API health check failed:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
}

/**
 * Test artist search functionality
 */
async function testArtistSearch() {
  console.log('\n🔍 Testing Artist Search...');
  try {
    const response = await fetch(`${API_BASE}/api/search/artists?q=test`);
    const data = await response.json();
    
    console.log(`✅ Search returned ${data.artists?.length || 0} artists`);
    return data.artists?.length > 0 || false;
  } catch (error) {
    console.log('❌ Artist search error:', error.message);
    return false;
  }
}

/**
 * Test artist sync functionality
 */
async function testArtistSync() {
  console.log('\n🎵 Testing Artist Sync...');
  try {
    // First, try to get a list of artists
    const artistsResponse = await fetch(`${API_BASE}/api/artists`);
    const artistsData = await artistsResponse.json();
    
    if (artistsData.artists && artistsData.artists.length > 0) {
      const testArtist = artistsData.artists[0];
      console.log(`  - Testing sync for artist: ${testArtist.name}`);
      
      // Test show sync for this artist
      const syncResponse = await fetch(`${API_BASE}/api/sync/shows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId: testArtist.id })
      });
      
      const syncData = await syncResponse.json();
      
      if (syncData.success) {
        console.log(`✅ Successfully synced ${syncData.showsCount} shows for ${testArtist.name}`);
        return true;
      } else {
        console.log('❌ Show sync failed:', syncData.error);
        return false;
      }
    } else {
      console.log('⚠️  No artists found to test sync');
      return false;
    }
  } catch (error) {
    console.log('❌ Artist sync error:', error.message);
    return false;
  }
}

/**
 * Test trending functionality
 */
async function testTrending() {
  console.log('\n📈 Testing Trending Functionality...');
  try {
    const response = await fetch(`${API_BASE}/api/trending`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Trending data loaded successfully`);
      console.log(`  - Artists: ${data.artists?.length || 0}`);
      console.log(`  - Shows: ${data.shows?.length || 0}`);
      console.log(`  - Venues: ${data.venues?.length || 0}`);
      return true;
    } else {
      console.log('❌ Trending load failed:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Trending error:', error.message);
    return false;
  }
}

/**
 * Test page routes
 */
async function testRoutes() {
  console.log('\n🧭 Testing Core Routes...');
  const routes = [
    { path: '/', name: 'Homepage' },
    { path: '/artists', name: 'Artists Page' },
    { path: '/shows', name: 'Shows Page' },
    { path: '/trending', name: 'Trending Page' },
    { path: '/venues', name: 'Venues Page' }
  ];
  
  let successCount = 0;
  
  for (const route of routes) {
    try {
      const response = await fetch(`${API_BASE}${route.path}`);
      if (response.ok) {
        console.log(`✅ ${route.name} - Status: ${response.status}`);
        successCount++;
      } else {
        console.log(`❌ ${route.name} - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${route.name} - Error: ${error.message}`);
    }
  }
  
  return successCount === routes.length;
}

/**
 * Main test function
 */
async function runComprehensiveTest() {
  const results = {
    health: false,
    search: false,
    sync: false,
    trending: false,
    routes: false
  };
  
  results.health = await testHealth();
  results.search = await testArtistSearch();
  results.sync = await testArtistSync();
  results.trending = await testTrending();
  results.routes = await testRoutes();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const tests = [
    { name: 'API Health', result: results.health },
    { name: 'Artist Search', result: results.search },
    { name: 'Data Sync', result: results.sync },
    { name: 'Trending Data', result: results.trending },
    { name: 'Route Access', result: results.routes }
  ];
  
  let passedCount = 0;
  tests.forEach(test => {
    const status = test.result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test.name}`);
    if (test.result) passedCount++;
  });
  
  const successRate = ((passedCount / tests.length) * 100).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log(`🎯 OVERALL RESULT: ${passedCount}/${tests.length} tests passed (${successRate}%)`);
  
  if (successRate >= 80) {
    console.log('🎉 MySetlist core functionality is working well!');
  } else if (successRate >= 60) {
    console.log('⚠️  MySetlist has some issues that need attention');
  } else {
    console.log('🚨 MySetlist has significant issues requiring immediate fixes');
  }
  
  console.log('='.repeat(60));
  
  return successRate >= 80;
}

// Run the test - ES module compatible
runComprehensiveTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });

export { runComprehensiveTest };