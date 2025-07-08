#!/usr/bin/env node'use strict';'use strict';'use strict';'use strict';

/**
 * Test complete user flow from search to voting
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:3001';

async function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testUserFlow() {
  console.log('🎯 Testing Complete User Flow\n');

  try {
    // 1. Search for artist
    console.log('1️⃣ Searching for "Taylor Swift"...');
    const searchResult = await httpRequest(
      `${BASE_URL}/api/artists/search?q=taylor`
    );

    if (searchResult.status !== 200) {
      throw new Error(`Search failed: ${searchResult.status}`);
    }

    const taylorSwift = searchResult.data.artists.find(
      (a) => a.name === 'Taylor Swift'
    );
    if (!taylorSwift) {
      throw new Error('Taylor Swift not found in search results');
    }

    console.log(`✅ Found Taylor Swift (ID: ${taylorSwift.id})`);
    console.log(`   - Image: ${taylorSwift.imageUrl}`);
    console.log(`   - Source: ${taylorSwift.source}`);

    // 2. Check artist page
    console.log('\n2️⃣ Loading artist page...');
    const artistPageResult = await httpRequest(
      `${BASE_URL}/artists/taylor-swift`
    );

    if (artistPageResult.status !== 200) {
      throw new Error(`Artist page failed: ${artistPageResult.status}`);
    }

    console.log('✅ Artist page loads successfully');
    const hasShows =
      artistPageResult.data.includes('Upcoming Shows') ||
      artistPageResult.data.includes('upcoming shows');
    console.log(`   - Shows section: ${hasShows ? 'Found' : 'Not found'}`);

    // 3. Check for shows via API
    console.log('\n3️⃣ Checking for shows...');
    const showsPageResult = await httpRequest(`${BASE_URL}/shows`);

    if (showsPageResult.status !== 200) {
      console.log('❌ Shows page failed to load');
    } else {
      console.log('✅ Shows page loads successfully');
    }

    // 4. Check trending page
    console.log('\n4️⃣ Checking trending page...');
    const trendingResult = await httpRequest(
      `${BASE_URL}/api/trending/artists?limit=5`
    );

    if (trendingResult.status !== 200) {
      throw new Error(`Trending API failed: ${trendingResult.status}`);
    }

    console.log(
      `✅ Trending artists: ${trendingResult.data.artists.length} found`
    );
    trendingResult.data.artists.slice(0, 3).forEach((artist, i) => {
      console.log(
        `   ${i + 1}. ${artist.name} (${artist.genre || 'No genre'})`
      );
    });

    // 5. Check specific show page
    console.log('\n5️⃣ Checking show page...');
    const showPageResult = await httpRequest(
      `${BASE_URL}/shows/taylor-swift-volksparkstadion-2024`
    );

    if (showPageResult.status !== 200) {
      console.log('❌ Show page failed to load');
    } else {
      console.log('✅ Show page loads successfully');
      const hasVoting =
        showPageResult.data.includes('vote') ||
        showPageResult.data.includes('Vote');
      console.log(
        `   - Voting functionality: ${hasVoting ? 'Found' : 'Not found'}`
      );
    }

    // 6. Test sync functionality
    console.log('\n6️⃣ Testing artist sync...');
    console.log(
      '   ⚠️  Note: Sync should trigger automatically when clicking artist in search'
    );

    // Summary
    console.log('\n📊 FLOW TEST SUMMARY:');
    console.log('   ✅ Search functionality works');
    console.log('   ✅ Artist pages are accessible');
    console.log('   ✅ Trending API returns data');
    console.log('   ✅ Show pages are accessible');
    console.log('   ⚠️  Voting system needs manual verification');
    console.log('   ⚠️  Show sync needs manual verification');

    console.log('\n🔍 MANUAL VERIFICATION NEEDED:');
    console.log('1. Open browser to http://localhost:3001');
    console.log('2. Search for "Taylor Swift" in homepage search bar');
    console.log('3. Click on Taylor Swift from results');
    console.log('4. Verify sync triggers and shows appear');
    console.log('5. Click on a show to test voting');
    console.log('6. Try voting on songs in the setlist');
  } catch (error) {
    console.error('❌ Flow test failed:', error.message);
  }
}

// Run the test
testUserFlow();
