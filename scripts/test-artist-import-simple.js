#!/usr/bin/env node

/**
 * Simple test script for artist import functionality
 * Can be run without TypeScript setup
 */

const fetch = require('node-fetch');

// Configuration
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const CRON_SECRET = process.env.CRON_SECRET;

// Test artist (Arctic Monkeys)
const TEST_ARTIST_ID = 'K8vZ917Ga97';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testArtistImport() {
  console.log('🎵 Testing Artist Import...');
  console.log(`Using APP_URL: ${APP_URL}`);
  console.log(`Testing with Ticketmaster ID: ${TEST_ARTIST_ID}`);
  console.log('');

  try {
    // Import the artist (POST-only; GET may not be implemented for this route)
    console.log('🔄 Importing new artist...');
    const importResponse = await fetch(`${APP_URL}/api/artists/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tmAttractionId: TEST_ARTIST_ID })
    });

    const importResult = await importResponse.json();
    
    console.log('Import response status:', importResponse.status);
    console.log('Import result:', JSON.stringify(importResult, null, 2));

    if (importResponse.ok && (importResult.artistId || importResult.slug)) {
      console.log('✅ Artist import successful!');
      console.log(`   Artist ID: ${importResult.artistId}`);
      console.log(`   Slug: ${importResult.slug}`);
      
      console.log('⏳ Waiting 10 seconds for background processes...');
      await delay(10000);
      
      return true;
    } else {
      console.log('❌ Artist import failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Error during artist import:', error.message);
    return false;
  }
}

async function testCronJobManual() {
  if (!CRON_SECRET) {
    console.log('⚠️  CRON_SECRET not found, skipping cron job test');
    return false;
  }

  console.log('⏰ Testing Manual Cron Job Trigger...');
  
  try {
    const response = await fetch(`${APP_URL}/api/cron/finish-mysetlist-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`
      },
      body: JSON.stringify({ mode: 'manual', orchestrate: false })
    });

    const result = await response.json();
    
    console.log('Cron job response status:', response.status);
    console.log('Cron job result:', JSON.stringify(result, null, 2));

    if (response.ok && result.success !== false) {
      console.log('✅ Cron job trigger successful!');
      return true;
    } else {
      console.log('❌ Cron job trigger failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Error during cron job test:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 TheSet Artist Import Test');
  console.log('=' .repeat(40));
  console.log('');

  const results = {};
  
  // Test artist import
  results.artistImport = await testArtistImport();
  console.log('');
  
  // Test cron job
  results.cronJob = await testCronJobManual();
  console.log('');
  
  // Summary
  console.log('=' .repeat(40));
  console.log('📊 Test Summary:');
  console.log(`   Artist Import: ${results.artistImport ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Cron Job: ${results.cronJob ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(Boolean);
  console.log('');
  console.log(allPassed ? '🎉 All tests passed!' : '⚠️  Some tests failed');
  
  return allPassed;
}

// Run if called directly
if (require.main === module) {
  runTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

module.exports = { runTests };