#!/usr/bin/env tsx

/**
 * Simple test script to verify MySetlist app functionality
 */

const BASE_URL = 'http://localhost:3001';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(status: 'pass' | 'fail' | 'info', _message: string) {
  const _color =
    status === 'pass'
      ? colors.green
      : status === 'fail'
        ? colors.red
        : colors.blue;
  const _symbol = status === 'pass' ? '✅' : status === 'fail' ? '❌' : 'ℹ️';
}

async function testEndpoint(name: string, url: string, expectedStatus = 200) {
  try {
    const response = await fetch(url);
    if (response.status === expectedStatus) {
      log('pass', `${name}: ${response.status}`);
      return true;
    }
    log('fail', `${name}: Expected ${expectedStatus}, got ${response.status}`);
    return false;
  } catch (error) {
    log('fail', `${name}: ${error.message}`);
    return false;
  }
}

async function testAPI(
  name: string,
  url: string,
  validate?: (data: any) => boolean
) {
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
      if (validate && !validate(data)) {
        log('fail', `${name}: Invalid response data`);
        return false;
      }
      log(
        'pass',
        `${name}: ${response.status} - ${JSON.stringify(data).substring(0, 100)}...`
      );
      return true;
    }
    log(
      'fail',
      `${name}: ${response.status} - ${data.error || 'Unknown error'}`
    );
    return false;
  } catch (error) {
    log('fail', `${name}: ${error.message}`);
    return false;
  }
}

async function runTests() {
  let _passCount = 0;
  let failCount = 0;

  // Test pages
  log('info', 'Testing page routes...');
  if (await testEndpoint('Homepage', `${BASE_URL}/`)) {
    _passCount++;
  } else {
    failCount++;
  }
  if (await testEndpoint('Artists page', `${BASE_URL}/artists`)) {
    _passCount++;
  } else {
    failCount++;
  }
  if (await testEndpoint('Shows page', `${BASE_URL}/shows`)) {
    _passCount++;
  } else {
    failCount++;
  }
  if (await testEndpoint('Venues page', `${BASE_URL}/venues`)) {
    _passCount++;
  } else {
    failCount++;
  }
  if (await testEndpoint('Trending page', `${BASE_URL}/trending`)) {
    _passCount++;
  } else {
    failCount++;
  }

  // Test APIs
  log('info', '\nTesting API endpoints...');
  if (
    await testAPI(
      'Artist search',
      `${BASE_URL}/api/artists/search?q=taylor`,
      (data) => data.artists && Array.isArray(data.artists)
    )
  ) {
    _passCount++;
  } else {
    failCount++;
  }

  if (
    await testAPI(
      'Trending artists',
      `${BASE_URL}/api/trending/artists?limit=5`,
      (data) =>
        data.artists && Array.isArray(data.artists) && data.artists.length > 0
    )
  ) {
    _passCount++;
  } else {
    failCount++;
  }

  if (
    await testAPI(
      'Trending shows',
      `${BASE_URL}/api/trending/shows?limit=5`,
      (data) => data.shows && Array.isArray(data.shows) && data.shows.length > 0
    )
  ) {
    _passCount++;
  } else {
    failCount++;
  }

  // Test specific artist page
  log('info', '\nTesting artist pages...');
  if (
    await testEndpoint('Taylor Swift page', `${BASE_URL}/artists/taylor-swift`)
  ) {
    _passCount++;
  } else {
    failCount++;
  }

  // Test specific show page
  log('info', '\nTesting show pages...');
  if (
    await testEndpoint(
      'Taylor Swift show',
      `${BASE_URL}/shows/taylor-swift-volksparkstadion-2024`
    )
  ) {
    _passCount++;
  } else {
    failCount++;
  }

  if (failCount === 0) {
  } else {
  }
}

// Run the tests
runTests().catch(console.error);
