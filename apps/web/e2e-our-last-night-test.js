#!/usr/bin/env node

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const ARTIST_SEARCH_TERM = 'Our Last Night';

// Test results storage
const testResults = {
  homepage: { passed: false, error: null },
  search: { passed: false, error: null, results: [] },
  artistPage: { passed: false, error: null, artistData: null },
  dataSync: { passed: false, error: null, syncData: null },
  showPages: { passed: false, error: null, shows: [] },
  voting: { passed: false, error: null },
  allPages: { passed: false, error: null, pages: [] },
};

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
          'User-Agent': 'Mozilla/5.0 (compatible; MySetlist-E2E-Test)',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          ...options.headers,
        },
        timeout: 30000,
        ...options,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            url: url,
          });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => reject(new Error(`Request timeout: ${url}`)));

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Test 1: Homepage loads successfully
async function testHomepage() {
  console.log('🏠 Testing Homepage...');
  try {
    const response = await makeRequest(`${BASE_URL}/`);

    if (response.statusCode === 200) {
      const hasSearchBar =
        response.body.includes('search') || response.body.includes('Search');
      const hasNavigation =
        response.body.includes('nav') || response.body.includes('Navigation');

      if (hasSearchBar && hasNavigation) {
        testResults.homepage.passed = true;
        console.log(
          '✅ Homepage loaded successfully with search and navigation'
        );
      } else {
        testResults.homepage.error =
          'Homepage missing search bar or navigation';
        console.log('❌ Homepage loaded but missing required elements');
      }
    } else {
      testResults.homepage.error = `HTTP ${response.statusCode}`;
      console.log(`❌ Homepage failed with status: ${response.statusCode}`);
    }
  } catch (error) {
    testResults.homepage.error = error.message;
    console.log(`❌ Homepage error: ${error.message}`);
  }
}

// Test 2: Search functionality
async function testSearch() {
  console.log('🔍 Testing Search for "Our Last Night"...');
  try {
    const searchUrl = `${BASE_URL}/api/search?q=${encodeURIComponent(ARTIST_SEARCH_TERM)}`;
    const response = await makeRequest(searchUrl);

    if (response.statusCode === 200) {
      try {
        const searchData = JSON.parse(response.body);

        if (searchData.artists && searchData.artists.length > 0) {
          const ourLastNightResult = searchData.artists.find((artist) =>
            artist.name.toLowerCase().includes('our last night')
          );

          if (ourLastNightResult) {
            testResults.search.passed = true;
            testResults.search.results = searchData.artists;
            console.log(
              `✅ Search found "Our Last Night" - Artist ID: ${ourLastNightResult.id}`
            );
          } else {
            testResults.search.error =
              'Our Last Night not found in search results';
            console.log('❌ Our Last Night not found in search results');
          }
        } else {
          testResults.search.error = 'No artists found in search results';
          console.log('❌ No artists found in search results');
        }
      } catch (parseError) {
        testResults.search.error = 'Invalid JSON response';
        console.log('❌ Search returned invalid JSON');
      }
    } else {
      testResults.search.error = `HTTP ${response.statusCode}`;
      console.log(`❌ Search failed with status: ${response.statusCode}`);
    }
  } catch (error) {
    testResults.search.error = error.message;
    console.log(`❌ Search error: ${error.message}`);
  }
}

// Test 3: Artist page loads
async function testArtistPage() {
  console.log('👨‍🎤 Testing Artist Page...');
  try {
    // First, we need to get the artist slug/id from search
    if (!testResults.search.passed) {
      testResults.artistPage.error = 'Search must pass first';
      console.log('❌ Cannot test artist page - search failed');
      return;
    }

    const ourLastNightArtist = testResults.search.results.find((artist) =>
      artist.name.toLowerCase().includes('our last night')
    );

    if (!ourLastNightArtist) {
      testResults.artistPage.error =
        'Our Last Night artist not found in search results';
      console.log('❌ Our Last Night artist not found in search results');
      return;
    }

    const artistSlug =
      ourLastNightArtist.slug ||
      ourLastNightArtist.name.toLowerCase().replace(/\s+/g, '-');
    const artistUrl = `${BASE_URL}/artists/${artistSlug}`;

    const response = await makeRequest(artistUrl);

    if (response.statusCode === 200) {
      const hasArtistName = response.body.includes('Our Last Night');
      const hasShows =
        response.body.includes('shows') || response.body.includes('concerts');

      if (hasArtistName) {
        testResults.artistPage.passed = true;
        testResults.artistPage.artistData = { slug: artistSlug, hasShows };
        console.log(`✅ Artist page loaded successfully: ${artistUrl}`);
      } else {
        testResults.artistPage.error = 'Artist page missing artist name';
        console.log('❌ Artist page loaded but missing artist name');
      }
    } else {
      testResults.artistPage.error = `HTTP ${response.statusCode}`;
      console.log(`❌ Artist page failed with status: ${response.statusCode}`);
    }
  } catch (error) {
    testResults.artistPage.error = error.message;
    console.log(`❌ Artist page error: ${error.message}`);
  }
}

// Test 4: Data sync functionality
async function testDataSync() {
  console.log('🔄 Testing Data Sync...');
  try {
    if (!testResults.search.passed) {
      testResults.dataSync.error = 'Search must pass first';
      console.log('❌ Cannot test data sync - search failed');
      return;
    }

    const ourLastNightArtist = testResults.search.results.find((artist) =>
      artist.name.toLowerCase().includes('our last night')
    );

    if (!ourLastNightArtist) {
      testResults.dataSync.error = 'Artist not found';
      console.log('❌ Artist not found for sync testing');
      return;
    }

    // Test the sync API endpoint
    const syncUrl = `${BASE_URL}/api/sync/artist`;
    const syncResponse = await makeRequest(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        artistId: ourLastNightArtist.id,
        artistName: ourLastNightArtist.name,
      }),
    });

    if (syncResponse.statusCode === 200 || syncResponse.statusCode === 202) {
      testResults.dataSync.passed = true;
      console.log('✅ Data sync API responding correctly');
    } else {
      testResults.dataSync.error = `Sync API returned ${syncResponse.statusCode}`;
      console.log(
        `❌ Data sync failed with status: ${syncResponse.statusCode}`
      );
    }
  } catch (error) {
    testResults.dataSync.error = error.message;
    console.log(`❌ Data sync error: ${error.message}`);
  }
}

// Test 5: Show pages functionality
async function testShowPages() {
  console.log('🎭 Testing Show Pages...');
  try {
    const showsUrl = `${BASE_URL}/shows`;
    const response = await makeRequest(showsUrl);

    if (response.statusCode === 200) {
      const hasShowsContent =
        response.body.includes('show') || response.body.includes('concert');

      if (hasShowsContent) {
        testResults.showPages.passed = true;
        console.log('✅ Shows page loaded successfully');
      } else {
        testResults.showPages.error = 'Shows page missing content';
        console.log('❌ Shows page loaded but missing content');
      }
    } else {
      testResults.showPages.error = `HTTP ${response.statusCode}`;
      console.log(`❌ Shows page failed with status: ${response.statusCode}`);
    }
  } catch (error) {
    testResults.showPages.error = error.message;
    console.log(`❌ Shows page error: ${error.message}`);
  }
}

// Test 6: Voting functionality
async function testVoting() {
  console.log('🗳️ Testing Voting Functionality...');
  try {
    const votesUrl = `${BASE_URL}/api/votes/anonymous`;
    const response = await makeRequest(votesUrl);

    if (response.statusCode === 200 || response.statusCode === 405) {
      // 405 is acceptable for GET request on POST endpoint
      testResults.voting.passed = true;
      console.log('✅ Voting API endpoint accessible');
    } else {
      testResults.voting.error = `HTTP ${response.statusCode}`;
      console.log(`❌ Voting API failed with status: ${response.statusCode}`);
    }
  } catch (error) {
    testResults.voting.error = error.message;
    console.log(`❌ Voting error: ${error.message}`);
  }
}

// Test 7: All major pages load
async function testAllPages() {
  console.log('📄 Testing All Major Pages...');
  const pagesToTest = [
    '/',
    '/artists',
    '/shows',
    '/trending',
    '/venues',
    '/discover',
  ];

  const results = [];

  for (const page of pagesToTest) {
    try {
      const response = await makeRequest(`${BASE_URL}${page}`);
      const passed = response.statusCode === 200;
      results.push({ page, passed, statusCode: response.statusCode });

      if (passed) {
        console.log(`✅ Page ${page} loaded successfully`);
      } else {
        console.log(
          `❌ Page ${page} failed with status: ${response.statusCode}`
        );
      }
    } catch (error) {
      results.push({ page, passed: false, error: error.message });
      console.log(`❌ Page ${page} error: ${error.message}`);
    }
  }

  testResults.allPages.pages = results;
  testResults.allPages.passed = results.every((r) => r.passed);
}

// Generate test report
function generateReport() {
  console.log('\n📊 COMPREHENSIVE TEST REPORT');
  console.log('='.repeat(50));

  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log(`\n🎯 SUMMARY: ${passedTests}/${totalTests} tests passed`);

  if (failedTests > 0) {
    console.log(`❌ ${failedTests} tests failed`);
  } else {
    console.log('✅ All tests passed!');
  }

  console.log('\n📝 DETAILED RESULTS:');

  Object.entries(testResults).forEach(([testName, result]) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`\n${testName.toUpperCase()}: ${status}`);

    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }

    if (result.results && result.results.length > 0) {
      console.log(`  Results: ${result.results.length} items found`);
    }

    if (result.artistData) {
      console.log(
        `  Artist Data: ${JSON.stringify(result.artistData, null, 2)}`
      );
    }

    if (result.pages) {
      result.pages.forEach((page) => {
        const pageStatus = page.passed ? '✅' : '❌';
        console.log(
          `  ${pageStatus} ${page.page} (${page.statusCode || 'error'})`
        );
      });
    }
  });

  console.log('\n🔍 RECOMMENDATIONS:');

  if (!testResults.homepage.passed) {
    console.log('- Fix homepage loading issues');
  }

  if (!testResults.search.passed) {
    console.log('- Fix search functionality for artist discovery');
  }

  if (!testResults.artistPage.passed) {
    console.log('- Fix artist page loading and data display');
  }

  if (!testResults.dataSync.passed) {
    console.log('- Fix data synchronization system');
  }

  if (!testResults.showPages.passed) {
    console.log('- Fix show pages and setlist display');
  }

  if (!testResults.voting.passed) {
    console.log('- Fix voting system for anonymous users');
  }

  if (!testResults.allPages.passed) {
    console.log('- Fix failing page routes');
  }

  console.log('\n' + '='.repeat(50));
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting E2E Tests for "Our Last Night" Flow');
  console.log('='.repeat(50));

  try {
    await testHomepage();
    await testSearch();
    await testArtistPage();
    await testDataSync();
    await testShowPages();
    await testVoting();
    await testAllPages();

    generateReport();

    // Exit with appropriate code
    const allPassed = Object.values(testResults).every((r) => r.passed);
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Tests interrupted by user');
  process.exit(1);
});

// Run the tests
runTests();
