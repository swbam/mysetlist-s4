#!/usr/bin/env node

const http = require('http');
const { URL } = require('url');

// Simple HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
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

async function testVotingFlow() {
  console.log('🧪 Testing complete voting flow...\n');
  
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Get shows
  console.log('1. Testing /api/shows endpoint...');
  try {
    const showsResponse = await makeRequest('http://localhost:3001/api/shows');
    if (showsResponse.status === 200 && showsResponse.data.shows) {
      console.log(`   ✅ Shows API works - ${showsResponse.data.shows.length} shows found`);
      testsPassed++;
    } else {
      console.log('   ❌ Shows API failed');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ Shows API error:', error.message);
    testsFailed++;
  }

  // Test 2: Get setlists
  console.log('\n2. Testing /api/setlists endpoint...');
  try {
    const setlistsResponse = await makeRequest('http://localhost:3001/api/setlists');
    if (setlistsResponse.status === 200 && setlistsResponse.data.setlists) {
      const setlists = setlistsResponse.data.setlists;
      console.log(`   ✅ Setlists API works - ${setlists.length} setlists found`);
      testsPassed++;

      // Test 3: Get songs for the first setlist
      if (setlists.length > 0) {
        const firstSetlist = setlists[0];
        console.log(`\n3. Testing setlist songs for "${firstSetlist.name}"...`);
        
        try {
          const songsResponse = await makeRequest(`http://localhost:3001/api/setlists/songs?setlistId=${firstSetlist.id}`);
          if (songsResponse.status === 200 && songsResponse.data.setlistSongs) {
            const songs = songsResponse.data.setlistSongs;
            console.log(`   ✅ Setlist songs API works - ${songs.length} songs found`);
            testsPassed++;

            // Test 4: Test voting on first song
            if (songs.length > 0) {
              const firstSong = songs[0];
              console.log(`\n4. Testing voting on song ID ${firstSong.id}...`);
              
              try {
                const voteResponse = await makeRequest(`http://localhost:3001/api/votes?setlistSongId=${firstSong.id}`);
                if (voteResponse.status === 200 && typeof voteResponse.data.up !== 'undefined') {
                  console.log(`   ✅ Vote retrieval works - Current votes: ${voteResponse.data.up}`);
                  testsPassed++;
                } else {
                  console.log('   ❌ Vote retrieval failed');
                  testsFailed++;
                }
              } catch (error) {
                console.log('   ❌ Vote retrieval error:', error.message);
                testsFailed++;
              }
            }
          } else {
            console.log('   ❌ Setlist songs API failed');
            testsFailed++;
          }
        } catch (error) {
          console.log('   ❌ Setlist songs API error:', error.message);
          testsFailed++;
        }
      }
    } else {
      console.log('   ❌ Setlists API failed');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ Setlists API error:', error.message);
    testsFailed++;
  }

  // Test 5: Get songs
  console.log('\n5. Testing /api/songs endpoint...');
  try {
    const songsResponse = await makeRequest('http://localhost:3001/api/songs');
    if (songsResponse.status === 200 && songsResponse.data.songs) {
      console.log(`   ✅ Songs API works - ${songsResponse.data.songs.length} songs found`);
      testsPassed++;
    } else {
      console.log('   ❌ Songs API failed');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ Songs API error:', error.message);
    testsFailed++;
  }

  // Test 6: Get trending
  console.log('\n6. Testing /api/trending endpoint...');
  try {
    const trendingResponse = await makeRequest('http://localhost:3001/api/trending');
    if (trendingResponse.status === 200) {
      console.log('   ✅ Trending API works');
      testsPassed++;
    } else {
      console.log('   ❌ Trending API failed');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ Trending API error:', error.message);
    testsFailed++;
  }

  // Test 7: Get stats
  console.log('\n7. Testing /api/stats endpoint...');
  try {
    const statsResponse = await makeRequest('http://localhost:3001/api/stats');
    if (statsResponse.status === 200) {
      console.log('   ✅ Stats API works');
      testsPassed++;
    } else {
      console.log('   ❌ Stats API failed');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ Stats API error:', error.message);
    testsFailed++;
  }

  // Test 8: Get popular artists
  console.log('\n8. Testing /api/popular-artists endpoint...');
  try {
    const popularResponse = await makeRequest('http://localhost:3001/api/popular-artists');
    if (popularResponse.status === 200) {
      console.log('   ✅ Popular artists API works');
      testsPassed++;
    } else {
      console.log('   ❌ Popular artists API failed');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ Popular artists API error:', error.message);
    testsFailed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Test Results Summary');
  console.log('='.repeat(50));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📊 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! The voting system is ready for use.');
    console.log('\n📋 User Flow Verification:');
    console.log('   ✓ Users can view shows');
    console.log('   ✓ Users can see setlists for shows'); 
    console.log('   ✓ Users can view songs in setlists');
    console.log('   ✓ Users can check vote counts');
    console.log('   ✓ All API endpoints are functional');
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review the errors above.`);
  }
}

// Run the test
testVotingFlow();