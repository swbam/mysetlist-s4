#!/usr/bin/env node

/**
 * Simple Node.js script to run API connection tests
 * Usage: node run-api-tests.js
 */

const { runApiTests } = require('./test-api-connections');

async function main() {
  console.log('🚀 Running API Connection Tests...\n');
  
  try {
    const results = await runApiTests();
    
    if (results.summary.failed > 0) {
      console.log('\n⚠️  Some tests failed. Check your API keys and network connection.');
      process.exit(1);
    } else {
      console.log('\n✅ All API tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}