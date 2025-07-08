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

function log(status: 'pass' | 'fail' | 'info', message: string) {
  const color =
    status === 'pass'
      ? colors.green
      : status === 'fail'
        ? colors.red
        : colors.blue;
  const symbol = status === 'pass' ? '✅' : status === 'fail' ? '❌' : 'ℹ️';
  console.log(`${color}${symbol} ${message}${colors.reset}`);
}

async function testEndpoint(name: string, url: string, expectedStatus = 200) {
  try {
    const response = await fetch(url);
    if (response.status === expectedStatus) {
      log('pass', `${name}: ${response.status}`);
      return true;
    } else {
      log(
        'fail',
        `${name}: Expected ${expectedStatus}, got ${response.status}`
      );
      return false;
    }
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
    } else {
      log(
        'fail',
        `${name}: ${response.status} - ${data.error || 'Unknown error'}`
      );
      return false;
    }
  } catch (error) {
    log('fail', `${name}: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log(`\n${colors.blue}🧪 Testing MySetlist App Flow${colors.reset}\n`);

  let passCount = 0;
  let failCount = 0;

  // Test pages
  log('info', 'Testing page routes...');
  if (await testEndpoint('Homepage', `${BASE_URL}/`)) passCount++;
  else failCount++;
  if (await testEndpoint('Artists page', `${BASE_URL}/artists`)) passCount++;
  else failCount++;
  if (await testEndpoint('Shows page', `${BASE_URL}/shows`)) passCount++;
  else failCount++;
  if (await testEndpoint('Venues page', `${BASE_URL}/venues`)) passCount++;
  else failCount++;
  if (await testEndpoint('Trending page', `${BASE_URL}/trending`)) passCount++;
  else failCount++;

  // Test APIs
  log('info', '\nTesting API endpoints...');
  if (
    await testAPI(
      'Artist search',
      `${BASE_URL}/api/artists/search?q=taylor`,
      (data) => data.artists && Array.isArray(data.artists)
    )
  )
    passCount++;
  else failCount++;

  if (
    await testAPI(
      'Trending artists',
      `${BASE_URL}/api/trending/artists?limit=5`,
      (data) =>
        data.artists && Array.isArray(data.artists) && data.artists.length > 0
    )
  )
    passCount++;
  else failCount++;

  if (
    await testAPI(
      'Trending shows',
      `${BASE_URL}/api/trending/shows?limit=5`,
      (data) => data.shows && Array.isArray(data.shows) && data.shows.length > 0
    )
  )
    passCount++;
  else failCount++;

  // Test specific artist page
  log('info', '\nTesting artist pages...');
  if (
    await testEndpoint('Taylor Swift page', `${BASE_URL}/artists/taylor-swift`)
  )
    passCount++;
  else failCount++;

  // Test specific show page
  log('info', '\nTesting show pages...');
  if (
    await testEndpoint(
      'Taylor Swift show',
      `${BASE_URL}/shows/taylor-swift-volksparkstadion-2024`
    )
  )
    passCount++;
  else failCount++;

  // Summary
  console.log(`\n${colors.yellow}📊 Test Summary:${colors.reset}`);
  console.log(`${colors.green}✅ Passed: ${passCount}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failCount}${colors.reset}`);
  console.log(
    `${colors.blue}📈 Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%${colors.reset}\n`
  );

  if (failCount === 0) {
    console.log(
      `${colors.green}🎉 All tests passed! MySetlist app is functional!${colors.reset}`
    );
  } else {
    console.log(
      `${colors.red}⚠️  Some tests failed. Please check the issues above.${colors.reset}`
    );
  }
}

// Run the tests
runTests().catch(console.error);
