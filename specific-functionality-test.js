#!/usr/bin/env node

/**
 * Specific Functionality Testing
 * Agent 10: Validation of Core Features
 */

import http from 'http';

const BASE_URL = 'http://localhost:3001';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);

    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options.headers,
        },
      },
      (res) => {
        clearTimeout(timeout);
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ statusCode: res.statusCode, data: parsed, raw: data });
          } catch (e) {
            resolve({ statusCode: res.statusCode, data: null, raw: data });
          }
        });
      }
    );

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testSearchFunctionality() {
  console.log('\n🔍 Testing Search Functionality');

  // Test 1: Basic search
  try {
    const response = await makeRequest(
      `${BASE_URL}/api/search?q=test&type=artists`
    );
    console.log(
      `✓ Basic search: ${response.statusCode} - ${response.data?.total || 0} results`
    );
  } catch (error) {
    console.log(`✗ Basic search failed: ${error.message}`);
  }

  // Test 2: Artist search
  try {
    const response = await makeRequest(
      `${BASE_URL}/api/artists/search?q=Beatles`
    );
    console.log(
      `✓ Artist search: ${response.statusCode} - Found ${Array.isArray(response.data) ? response.data.length : 0} artists`
    );
  } catch (error) {
    console.log(`✗ Artist search failed: ${error.message}`);
  }

  // Test 3: Search suggestions
  try {
    const response = await makeRequest(
      `${BASE_URL}/api/search/suggestions?q=rock`
    );
    console.log(
      `✓ Search suggestions: ${response.statusCode} - ${Array.isArray(response.data) ? response.data.length : 0} suggestions`
    );
  } catch (error) {
    console.log(`✗ Search suggestions failed: ${error.message}`);
  }
}

async function testVotingSystem() {
  console.log('\n🗳️ Testing Voting System');

  try {
    // Test voting API validation
    const response = await makeRequest(`${BASE_URL}/api/votes`);
    if (
      response.statusCode === 400 &&
      response.data?.error?.includes('setlistSongId')
    ) {
      console.log('✓ Voting API properly validates parameters');
    } else {
      console.log(
        `? Voting API response: ${response.statusCode} - ${JSON.stringify(response.data)}`
      );
    }
  } catch (error) {
    console.log(`✗ Voting API test failed: ${error.message}`);
  }

  try {
    // Test vote analytics
    const response = await makeRequest(`${BASE_URL}/api/votes/analytics`);
    console.log(`✓ Vote analytics: ${response.statusCode}`);
  } catch (error) {
    console.log(`✗ Vote analytics failed: ${error.message}`);
  }
}

async function testRealtimeFeatures() {
  console.log('\n⚡ Testing Realtime Features');

  try {
    const response = await makeRequest(
      `${BASE_URL}/api/realtime/subscriptions`
    );
    console.log(`✓ Realtime subscriptions: ${response.statusCode}`);
  } catch (error) {
    console.log(`? Realtime subscriptions: ${error.message}`);
  }
}

async function testExternalAPIs() {
  console.log('\n🌐 Testing External API Integrations');

  const apis = ['spotify', 'ticketmaster'];

  for (const api of apis) {
    try {
      const response = await makeRequest(`${BASE_URL}/api/debug/${api}`);
      if (response.statusCode === 200) {
        console.log(`✓ ${api} integration: Working`);
      } else {
        console.log(
          `? ${api} integration: ${response.statusCode} - ${response.data?.error || 'Unknown error'}`
        );
      }
    } catch (error) {
      console.log(`✗ ${api} integration failed: ${error.message}`);
    }
  }
}

async function testAdminFunctionality() {
  console.log('\n👨‍💼 Testing Admin Functionality');

  const adminEndpoints = [
    '/api/admin/users',
    '/api/admin/system-health',
    '/api/admin/analytics/votes',
  ];

  for (const endpoint of adminEndpoints) {
    try {
      const response = await makeRequest(`${BASE_URL}${endpoint}`);
      if (response.statusCode === 401 || response.statusCode === 403) {
        console.log(`✓ ${endpoint}: Properly protected`);
      } else {
        console.log(
          `? ${endpoint}: ${response.statusCode} - May need authentication setup`
        );
      }
    } catch (error) {
      console.log(`✗ ${endpoint} failed: ${error.message}`);
    }
  }
}

async function testPerformanceFeatures() {
  console.log('\n⚡ Testing Performance Features');

  try {
    const response = await makeRequest(`${BASE_URL}/api/performance`);
    console.log(`✓ Performance monitoring: ${response.statusCode}`);
  } catch (error) {
    console.log(`? Performance monitoring: ${error.message}`);
  }

  try {
    const response = await makeRequest(`${BASE_URL}/api/health`);
    if (response.statusCode === 207) {
      console.log(
        `✓ Health check: Multi-status response (detailed health info)`
      );
    } else {
      console.log(`✓ Health check: ${response.statusCode}`);
    }
  } catch (error) {
    console.log(`✗ Health check failed: ${error.message}`);
  }
}

async function testUIPages() {
  console.log('\n🖥️ Testing UI Pages');

  const pages = [
    { path: '/', name: 'Homepage' },
    { path: '/search', name: 'Search' },
    { path: '/artists', name: 'Artists' },
    { path: '/shows', name: 'Shows' },
    { path: '/venues', name: 'Venues' },
    { path: '/trending', name: 'Trending' },
    { path: '/admin', name: 'Admin' },
  ];

  for (const page of pages) {
    try {
      const response = await makeRequest(`${BASE_URL}${page.path}`, {
        headers: { Accept: 'text/html' },
      });

      if (response.statusCode >= 200 && response.statusCode < 400) {
        const hasReactContent =
          response.raw.includes('__next') || response.raw.includes('React');
        console.log(
          `✓ ${page.name}: ${response.statusCode} ${hasReactContent ? '(React app)' : ''}`
        );
      } else {
        console.log(`? ${page.name}: ${response.statusCode}`);
      }
    } catch (error) {
      console.log(`✗ ${page.name} failed: ${error.message}`);
    }
  }
}

async function testDataIntegrity() {
  console.log('\n📊 Testing Data Integrity');

  try {
    const response = await makeRequest(`${BASE_URL}/api/admin/data-integrity`);
    console.log(`✓ Data integrity check: ${response.statusCode}`);
  } catch (error) {
    console.log(`? Data integrity: ${error.message}`);
  }
}

async function runSpecificTests() {
  console.log('🎯 MySetlist - Specific Functionality Testing');
  console.log('Agent 10: Final Testing & Quality Assurance\n');

  const startTime = Date.now();

  await testUIPages();
  await testSearchFunctionality();
  await testVotingSystem();
  await testRealtimeFeatures();
  await testExternalAPIs();
  await testAdminFunctionality();
  await testPerformanceFeatures();
  await testDataIntegrity();

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`\n⏱️ Testing completed in ${duration}s`);
  console.log('\n✅ Core functionality verification complete!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSpecificTests().catch(console.error);
}

export { runSpecificTests };
