#!/usr/bin/env ts-node

/**
 * TypeScript script to run comprehensive API tests
 * Usage: npx ts-node run-tests.ts
 * Or: npm run test:apis
 */

import { runApiTests, testServiceIntegrations } from './test-api-connections';

async function main() {
  console.log('🚀 External API Clients Test Suite\n');
  console.log('Testing connectivity and functionality for:');
  console.log('  • Spotify Web API');
  console.log('  • Ticketmaster Discovery API'); 
  console.log('  • Setlist.fm API\n');
  
  try {
    // Run basic connectivity tests
    console.log('Phase 1: Basic Connectivity Tests');
    console.log('================================\n');
    
    const results = await runApiTests();
    
    // Run integration tests if all basic tests pass
    if (results.summary.failed === 0) {
      console.log('\nPhase 2: Integration Tests');
      console.log('==========================\n');
      
      await testServiceIntegrations();
    } else {
      console.log('\n⚠️  Skipping integration tests due to failed connectivity tests');
      
      // Show specific failures
      const failedTests = results.results.filter(r => !r.success);
      console.log('\nFailed Tests:');
      failedTests.forEach(test => {
        console.log(`  ❌ ${test.service}: ${test.error}`);
      });
    }
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('FINAL RESULTS');
    console.log('='.repeat(50));
    
    if (results.summary.failed > 0) {
      console.log(`❌ ${results.summary.failed}/${results.summary.total} tests failed`);
      console.log('\nTroubleshooting:');
      console.log('1. Check that all required environment variables are set:');
      console.log('   - SPOTIFY_CLIENT_ID');
      console.log('   - SPOTIFY_CLIENT_SECRET');
      console.log('   - TICKETMASTER_API_KEY');
      console.log('   - SETLISTFM_API_KEY');
      console.log('2. Verify your network connection');
      console.log('3. Check API key validity and rate limits');
      
      process.exit(1);
    } else {
      console.log(`✅ All ${results.summary.total} tests passed!`);
      console.log(`📊 Total execution time: ${results.summary.duration}ms`);
      console.log('\n🎉 API clients are ready for production use!');
      
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    process.exit(1);
  }
}

// Handle unhandled rejections gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the test suite
if (require.main === module) {
  main().catch(error => {
    console.error('Main function failed:', error);
    process.exit(1);
  });
}