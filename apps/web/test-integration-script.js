#!/usr/bin/env node

/**
 * Integration test script to verify frontend-backend communication
 * Run with: node test-integration-script.js
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 Testing ${name}...`);
  try {
    const response = await fetch(`${BASE_URL}${url}`, options);
    const contentType = response.headers.get('content-type');
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${contentType}`);
    
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 500));
    } else if (contentType?.includes('text/')) {
      const text = await response.text();
      console.log(`   Response:`, text.substring(0, 200));
    }
    
    if (response.ok) {
      console.log(`   ✅ ${name} - PASSED`);
      return true;
    } else {
      console.log(`   ❌ ${name} - FAILED (${response.status})`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ${name} - ERROR: ${error.message}`);
    return false;
  }
}

async function testSSEEndpoint(name, url) {
  console.log(`\n🧪 Testing SSE ${name}...`);
  try {
    // For Node.js, we'll just test if the endpoint responds
    const response = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      console.log(`   ✅ ${name} - SSE endpoint accessible`);
      return true;
    } else {
      console.log(`   ❌ ${name} - FAILED (${response.status})`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ${name} - ERROR: ${error.message}`);
    return false;
  }
}

async function runIntegrationTests() {
  console.log('🚀 Starting Frontend-Backend Integration Tests');
  console.log(`   Base URL: ${BASE_URL}`);
  
  const results = [];
  
  // Test basic API endpoints
  results.push(await testEndpoint('Health Check', '/api/health'));
  results.push(await testEndpoint('Artist Search', '/api/search/artists?q=Taylor+Swift&limit=5'));
  results.push(await testEndpoint('Artist Status (Unknown)', '/api/artists/test-artist/status'));
  results.push(await testEndpoint('Import Status (Unknown)', '/api/artists/test-artist/import-status'));
  
  // Test SSE endpoints
  results.push(await testSSEEndpoint('Artist Stream', '/api/artists/test-artist/stream'));
  
  // Test import endpoint
  results.push(await testEndpoint(
    'Import Artist', 
    '/api/artists/import',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmAttractionId: 'K8vZ917G7x0' })
    }
  ));
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n📊 Test Results Summary:');
  console.log(`   Passed: ${passed}/${total}`);
  console.log(`   Success Rate: ${((passed/total) * 100).toFixed(1)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All integration tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above.');
    process.exit(1);
  }
}

// Run the tests
runIntegrationTests().catch(console.error);