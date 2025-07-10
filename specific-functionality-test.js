#!/usr/bin/env node

/**
 * Specific Functionality Testing
 * Agent 10: Validation of Core Features
 */

import http from 'node:http';

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
          } catch (_e) {
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
  // Test 1: Basic search
  try {
    const _response = await makeRequest(
      `${BASE_URL}/api/search?q=test&type=artists`
    );
  } catch (_error) {}

  // Test 2: Artist search
  try {
    const _response = await makeRequest(
      `${BASE_URL}/api/artists/search?q=Beatles`
    );
  } catch (_error) {}

  // Test 3: Search suggestions
  try {
    const _response = await makeRequest(
      `${BASE_URL}/api/search/suggestions?q=rock`
    );
  } catch (_error) {}
}

async function testVotingSystem() {
  try {
    // Test voting API validation
    const response = await makeRequest(`${BASE_URL}/api/votes`);
    if (
      response.statusCode === 400 &&
      response.data?.error?.includes('setlistSongId')
    ) {
    } else {
    }
  } catch (_error) {}

  try {
    // Test vote analytics
    const _response = await makeRequest(`${BASE_URL}/api/votes/analytics`);
  } catch (_error) {}
}

async function testRealtimeFeatures() {
  try {
    const _response = await makeRequest(
      `${BASE_URL}/api/realtime/subscriptions`
    );
  } catch (_error) {}
}

async function testExternalAPIs() {
  const apis = ['spotify', 'ticketmaster'];

  for (const api of apis) {
    try {
      const response = await makeRequest(`${BASE_URL}/api/debug/${api}`);
      if (response.statusCode === 200) {
      } else {
      }
    } catch (_error) {}
  }
}

async function testAdminFunctionality() {
  const adminEndpoints = [
    '/api/admin/users',
    '/api/admin/system-health',
    '/api/admin/analytics/votes',
  ];

  for (const endpoint of adminEndpoints) {
    try {
      const response = await makeRequest(`${BASE_URL}${endpoint}`);
      if (response.statusCode === 401 || response.statusCode === 403) {
      } else {
      }
    } catch (_error) {}
  }
}

async function testPerformanceFeatures() {
  try {
    const _response = await makeRequest(`${BASE_URL}/api/performance`);
  } catch (_error) {}

  try {
    const response = await makeRequest(`${BASE_URL}/api/health`);
    if (response.statusCode === 207) {
    } else {
    }
  } catch (_error) {}
}

async function testUIPages() {
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
        const _hasReactContent =
          response.raw.includes('__next') || response.raw.includes('React');
      } else {
      }
    } catch (_error) {}
  }
}

async function testDataIntegrity() {
  try {
    const _response = await makeRequest(`${BASE_URL}/api/admin/data-integrity`);
  } catch (_error) {}
}

async function runSpecificTests() {
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
  const _duration = ((endTime - startTime) / 1000).toFixed(2);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSpecificTests().catch(console.error);
}

export { runSpecificTests };
