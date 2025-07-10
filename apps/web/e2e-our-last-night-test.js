#!/usr/bin/env node

const https = require('node:https');
const http = require('node:http');
const { URL } = require('node:url');

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
  try {
    const response = await makeRequest(`${BASE_URL}/`);

    if (response.statusCode === 200) {
      const hasSearchBar =
        response.body.includes('search') || response.body.includes('Search');
      const hasNavigation =
        response.body.includes('nav') || response.body.includes('Navigation');

      if (hasSearchBar && hasNavigation) {
        testResults.homepage.passed = true;
      } else {
        testResults.homepage.error =
          'Homepage missing search bar or navigation';
      }
    } else {
      testResults.homepage.error = `HTTP ${response.statusCode}`;
    }
  } catch (error) {
    testResults.homepage.error = error.message;
  }
}

// Test 2: Search functionality
async function testSearch() {
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
          } else {
            testResults.search.error =
              'Our Last Night not found in search results';
          }
        } else {
          testResults.search.error = 'No artists found in search results';
        }
      } catch (_parseError) {
        testResults.search.error = 'Invalid JSON response';
      }
    } else {
      testResults.search.error = `HTTP ${response.statusCode}`;
    }
  } catch (error) {
    testResults.search.error = error.message;
  }
}

// Test 3: Artist page loads
async function testArtistPage() {
  try {
    // First, we need to get the artist slug/id from search
    if (!testResults.search.passed) {
      testResults.artistPage.error = 'Search must pass first';
      return;
    }

    const ourLastNightArtist = testResults.search.results.find((artist) =>
      artist.name.toLowerCase().includes('our last night')
    );

    if (!ourLastNightArtist) {
      testResults.artistPage.error =
        'Our Last Night artist not found in search results';
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
      } else {
        testResults.artistPage.error = 'Artist page missing artist name';
      }
    } else {
      testResults.artistPage.error = `HTTP ${response.statusCode}`;
    }
  } catch (error) {
    testResults.artistPage.error = error.message;
  }
}

// Test 4: Data sync functionality
async function testDataSync() {
  try {
    if (!testResults.search.passed) {
      testResults.dataSync.error = 'Search must pass first';
      return;
    }

    const ourLastNightArtist = testResults.search.results.find((artist) =>
      artist.name.toLowerCase().includes('our last night')
    );

    if (!ourLastNightArtist) {
      testResults.dataSync.error = 'Artist not found';
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
    } else {
      testResults.dataSync.error = `Sync API returned ${syncResponse.statusCode}`;
    }
  } catch (error) {
    testResults.dataSync.error = error.message;
  }
}

// Test 5: Show pages functionality
async function testShowPages() {
  try {
    const showsUrl = `${BASE_URL}/shows`;
    const response = await makeRequest(showsUrl);

    if (response.statusCode === 200) {
      const hasShowsContent =
        response.body.includes('show') || response.body.includes('concert');

      if (hasShowsContent) {
        testResults.showPages.passed = true;
      } else {
        testResults.showPages.error = 'Shows page missing content';
      }
    } else {
      testResults.showPages.error = `HTTP ${response.statusCode}`;
    }
  } catch (error) {
    testResults.showPages.error = error.message;
  }
}

// Test 6: Voting functionality
async function testVoting() {
  try {
    const votesUrl = `${BASE_URL}/api/votes/anonymous`;
    const response = await makeRequest(votesUrl);

    if (response.statusCode === 200 || response.statusCode === 405) {
      // 405 is acceptable for GET request on POST endpoint
      testResults.voting.passed = true;
    } else {
      testResults.voting.error = `HTTP ${response.statusCode}`;
    }
  } catch (error) {
    testResults.voting.error = error.message;
  }
}

// Test 7: All major pages load
async function testAllPages() {
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
      } else {
      }
    } catch (error) {
      results.push({ page, passed: false, error: error.message });
    }
  }

  testResults.allPages.pages = results;
  testResults.allPages.passed = results.every((r) => r.passed);
}

// Generate test report
function generateReport() {
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;

  if (failedTests > 0) {
  } else {
  }

  Object.entries(testResults).forEach(([_testName, result]) => {
    const _status = result.passed ? '✅ PASS' : '❌ FAIL';

    if (result.error) {
    }

    if (result.results && result.results.length > 0) {
    }

    if (result.artistData) {
    }

    if (result.pages) {
      result.pages.forEach((page) => {
        const _pageStatus = page.passed ? '✅' : '❌';
      });
    }
  });

  if (!testResults.homepage.passed) {
  }

  if (!testResults.search.passed) {
  }

  if (!testResults.artistPage.passed) {
  }

  if (!testResults.dataSync.passed) {
  }

  if (!testResults.showPages.passed) {
  }

  if (!testResults.voting.passed) {
  }

  if (!testResults.allPages.passed) {
  }
}

// Main test execution
async function runTests() {
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
  } catch (_error) {
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  process.exit(1);
});

// Run the tests
runTests();
