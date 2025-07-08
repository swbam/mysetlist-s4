#!/usr/bin/env node

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Test configuration
const BASE_URL = 'http://localhost:3001';

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestModule = urlObj.protocol === 'https:' ? https : http;

    const req = requestModule.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'MySetlist-DB-Test',
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
        timeout: 30000,
        ...options,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: jsonData,
              url: url,
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: data,
              url: url,
            });
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => reject(new Error(`Request timeout: ${url}`)));

    if (options.body) {
      req.write(
        typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body)
      );
    }

    req.end();
  });
}

async function testDatabaseContent() {
  console.log('🔍 Testing Database Content...');
  console.log('='.repeat(50));

  try {
    // Test 1: Check if we can add Our Last Night
    console.log('\n1. Testing Artist Sync for Our Last Night...');
    const syncResponse = await makeRequest(`${BASE_URL}/api/artists/sync`, {
      method: 'POST',
      body: {
        artistName: 'Our Last Night',
      },
    });

    console.log(`Sync API Status: ${syncResponse.statusCode}`);
    if (syncResponse.body) {
      console.log('Sync Response:', JSON.stringify(syncResponse.body, null, 2));
    }

    // Test 2: Try searching for Our Last Night after sync
    console.log('\n2. Searching for Our Last Night after sync...');
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

    const searchResponse = await makeRequest(
      `${BASE_URL}/api/search?q=Our+Last+Night`
    );
    console.log(`Search Status: ${searchResponse.statusCode}`);
    if (searchResponse.body && searchResponse.body.results) {
      console.log(`Found ${searchResponse.body.results.length} results:`);
      searchResponse.body.results.forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.title} (${result.type})`);
      });
    }

    // Test 3: Try Dispatch (known to have data based on previous discussions)
    console.log('\n3. Testing Dispatch sync...');
    const dispatchSync = await makeRequest(`${BASE_URL}/api/artists/sync`, {
      method: 'POST',
      body: {
        artistName: 'Dispatch',
      },
    });

    console.log(`Dispatch Sync Status: ${dispatchSync.statusCode}`);

    // Test 4: Search for Dispatch
    console.log('\n4. Searching for Dispatch...');
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

    const dispatchSearch = await makeRequest(
      `${BASE_URL}/api/search?q=Dispatch`
    );
    console.log(`Dispatch Search Status: ${dispatchSearch.statusCode}`);
    if (dispatchSearch.body && dispatchSearch.body.results) {
      console.log(
        `Found ${dispatchSearch.body.results.length} Dispatch results:`
      );
      dispatchSearch.body.results.forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.title} (${result.type})`);
      });
    }

    // Test 5: Try to get trending artists to see if any data exists
    console.log('\n5. Checking trending artists...');
    const trendingResponse = await makeRequest(
      `${BASE_URL}/api/trending/artists`
    );
    console.log(`Trending Status: ${trendingResponse.statusCode}`);
    if (trendingResponse.body) {
      console.log(
        'Trending Response:',
        JSON.stringify(trendingResponse.body, null, 2)
      );
    }

    // Test 6: Direct artist creation for testing
    console.log('\n6. Creating test artist directly...');
    const createResponse = await makeRequest(`${BASE_URL}/api/artists`, {
      method: 'POST',
      body: {
        name: 'Our Last Night',
        mbid: null,
        genres: ['Post-Hardcore', 'Rock'],
        image_url: 'https://example.com/image.jpg',
      },
    });

    console.log(`Create Artist Status: ${createResponse.statusCode}`);
    if (createResponse.body) {
      console.log(
        'Create Response:',
        JSON.stringify(createResponse.body, null, 2)
      );
    }

    // Test 7: Final search test
    console.log('\n7. Final search test...');
    const finalSearch = await makeRequest(
      `${BASE_URL}/api/search?q=Our+Last+Night`
    );
    console.log(`Final Search Status: ${finalSearch.statusCode}`);
    if (finalSearch.body && finalSearch.body.results) {
      console.log(`Final Results: ${finalSearch.body.results.length} found`);
      finalSearch.body.results.forEach((result, i) => {
        console.log(
          `  ${i + 1}. ${result.title} (${result.type}) - slug: ${result.slug}`
        );
      });
    }
  } catch (error) {
    console.error('❌ Database test error:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Database content test completed');
}

// Run the test
testDatabaseContent().catch(console.error);
