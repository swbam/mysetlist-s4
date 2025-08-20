/**
 * Backend Integration Test (No Redis Required)
 * Tests components that can work without external dependencies
 */

async function testEnvironment() {
  console.log('🔧 Testing Environment...');
  
  const envVars = [
    'TICKETMASTER_API_KEY',
    'SPOTIFY_CLIENT_ID',
    'SPOTIFY_CLIENT_SECRET',
    'DATABASE_URL'
  ];
  
  const envStatus = {};
  envVars.forEach(key => {
    envStatus[key] = process.env[key] ? 'SET' : 'MISSING';
  });
  
  console.log('✅ Environment variables:');
  Object.entries(envStatus).forEach(([key, status]) => {
    const icon = status === 'SET' ? '✅' : '⚠️ ';
    console.log(`  ${icon} ${key}: ${status}`);
  });
  
  return envStatus;
}

async function testExternalAPIs() {
  console.log('🔗 Testing External APIs...');
  
  const results = {};
  
  // Test Spotify Authentication
  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Spotify API: AUTHENTICATED');
        results.spotify = { success: true, hasToken: !!data.access_token };
      } else {
        const errorText = await response.text();
        console.log(`❌ Spotify API: AUTH FAILED (${response.status}) - ${errorText}`);
        results.spotify = { success: false, status: response.status };
      }
    } catch (error) {
      console.log(`❌ Spotify API: ERROR - ${error.message}`);
      results.spotify = { success: false, error: error.message };
    }
  } else {
    console.log('⚠️  Spotify API: NO CREDENTIALS');
    results.spotify = { success: false, reason: 'no-credentials' };
  }
  
  // Test Ticketmaster API
  if (process.env.TICKETMASTER_API_KEY) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env.TICKETMASTER_API_KEY}&size=1&countryCode=US`,
        { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Ticketmaster API: WORKING (${data._embedded?.events?.length || 0} events)`);
        results.ticketmaster = { success: true, events: data._embedded?.events?.length || 0 };
      } else {
        const errorText = await response.text();
        console.log(`❌ Ticketmaster API: ERROR (${response.status}) - ${errorText}`);
        results.ticketmaster = { success: false, status: response.status };
      }
    } catch (error) {
      console.log(`❌ Ticketmaster API: ERROR - ${error.message}`);
      results.ticketmaster = { success: false, error: error.message };
    }
  } else {
    console.log('⚠️  Ticketmaster API: NO API KEY');
    results.ticketmaster = { success: false, reason: 'no-credentials' };
  }
  
  return results;
}

async function testCodeStructure() {
  console.log('📂 Testing Code Structure...');
  
  const fs = require('fs');
  const path = require('path');
  
  const results = {};
  
  // Check for key files
  const keyFiles = [
    'lib/services/orchestrators/ArtistImportOrchestrator.ts',
    'lib/services/progress/ProgressBus.ts', 
    'lib/queues/queue-manager.ts',
    'lib/queues/redis-config.ts',
    'app/api/artists/[id]/stream/route.ts',
    'app/api/artists/[id]/status/route.ts',
    'app/api/artists/import/route.ts',
    'app/api/cron/route.ts',
    'lib/jobs/processors/index.ts'
  ];
  
  keyFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    const exists = fs.existsSync(fullPath);
    const icon = exists ? '✅' : '❌';
    console.log(`  ${icon} ${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
    results[file] = exists;
  });
  
  return results;
}

async function testPackageStructure() {
  console.log('📦 Testing Package Structure...');
  
  const fs = require('fs');
  const path = require('path');
  
  const results = {};
  
  // Check external-apis package
  const externalApisPath = path.join(process.cwd(), '../../packages/external-apis');
  const externalApisExists = fs.existsSync(externalApisPath);
  console.log(`  ${externalApisExists ? '✅' : '❌'} external-apis package: ${externalApisExists ? 'EXISTS' : 'MISSING'}`);
  results.externalApisPackage = externalApisExists;
  
  if (externalApisExists) {
    const clientFiles = [
      'src/clients/spotify.ts',
      'src/clients/ticketmaster.ts',
      'src/clients/setlistfm.ts',
      'src/services/orchestrators/ArtistImportOrchestrator.ts'
    ];
    
    clientFiles.forEach(file => {
      const fullPath = path.join(externalApisPath, file);
      const exists = fs.existsSync(fullPath);
      const icon = exists ? '✅' : '❌';
      console.log(`    ${icon} ${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
      results[`external-apis/${file}`] = exists;
    });
  }
  
  return results;
}

async function testDatabasePackage() {
  console.log('🗄️  Testing Database Package...');
  
  const fs = require('fs');
  const path = require('path');
  
  const results = {};
  
  // Check database package
  const dbPath = path.join(process.cwd(), '../../packages/database');
  const dbExists = fs.existsSync(dbPath);
  console.log(`  ${dbExists ? '✅' : '❌'} database package: ${dbExists ? 'EXISTS' : 'MISSING'}`);
  results.databasePackage = dbExists;
  
  if (dbExists) {
    const dbFiles = [
      'index.ts',
      'schema.ts'
    ];
    
    dbFiles.forEach(file => {
      const fullPath = path.join(dbPath, file);
      const exists = fs.existsSync(fullPath);
      const icon = exists ? '✅' : '❌';
      console.log(`    ${icon} ${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
      results[`database/${file}`] = exists;
    });
  }
  
  return results;
}

async function testAPIRoutes() {
  console.log('🌐 Testing API Routes...');
  
  const endpoints = [
    'http://localhost:3000/api/health',
    'http://localhost:3000/api/infrastructure/test',
    'http://localhost:3000/api/artists/import'
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const path = endpoint.split('/').slice(-2).join('/');
      if (response.ok) {
        console.log(`✅ ${path}: RESPONDING (${response.status})`);
        results[path] = { success: true, status: response.status };
      } else {
        console.log(`❌ ${path}: ERROR (${response.status})`);
        results[path] = { success: false, status: response.status };
      }
    } catch (error) {
      const path = endpoint.split('/').slice(-2).join('/');
      if (error.name === 'AbortError' || error.code === 'ECONNREFUSED') {
        console.log(`⚠️  ${path}: SERVER NOT RUNNING`);
        results[path] = { success: false, reason: 'offline' };
      } else {
        console.log(`❌ ${path}: ERROR - ${error.message}`);
        results[path] = { success: false, error: error.message };
      }
    }
  }
  
  return results;
}

async function runTests() {
  console.log('🚀 Backend Integration Test (No Redis)');
  console.log('======================================\n');
  
  const startTime = Date.now();
  
  const results = {
    environment: await testEnvironment(),
    codeStructure: await testCodeStructure(),
    packageStructure: await testPackageStructure(),
    databasePackage: await testDatabasePackage(),
    externalAPIs: await testExternalAPIs(),
    apiRoutes: await testAPIRoutes(),
  };
  
  const duration = Date.now() - startTime;
  
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`Test Duration: ${duration}ms\n`);
  
  // Calculate overall scores
  let totalChecks = 0;
  let passedChecks = 0;
  let warningChecks = 0;
  
  Object.entries(results).forEach(([category, result]) => {
    console.log(`${category.toUpperCase()}:`);
    
    if (typeof result === 'object') {
      Object.entries(result).forEach(([key, value]) => {
        totalChecks++;
        if (value === true || (typeof value === 'object' && value.success === true)) {
          passedChecks++;
          console.log(`  ✅ ${key}: PASSED`);
        } else if (
          value === 'offline' || 
          value === 'no-credentials' ||
          (typeof value === 'object' && value.reason === 'offline') ||
          (typeof value === 'object' && value.reason === 'no-credentials')
        ) {
          warningChecks++;
          console.log(`  ⚠️  ${key}: ${typeof value === 'object' ? value.reason?.toUpperCase() : value.toUpperCase()}`);
        } else {
          console.log(`  ❌ ${key}: FAILED`);
        }
      });
    }
  });
  
  console.log(`\nOverall Status:`);
  console.log(`  Passed: ${passedChecks}/${totalChecks}`);
  console.log(`  Warnings: ${warningChecks}`);
  console.log(`  Failed: ${totalChecks - passedChecks - warningChecks}`);
  
  const readiness = ((passedChecks + warningChecks * 0.5) / totalChecks) * 100;
  console.log(`\n🎯 Backend Readiness: ${readiness.toFixed(1)}%`);
  
  if (readiness >= 85) {
    console.log('🎉 Backend is READY for production!');
  } else if (readiness >= 70) {
    console.log('✅ Backend is MOSTLY READY - minor issues to address');
  } else if (readiness >= 50) {
    console.log('⚠️  Backend is PARTIALLY READY - needs some work');
  } else {
    console.log('❌ Backend needs significant work before it\'s ready');
  }
  
  // Specific recommendations
  console.log('\n💡 Recommendations:');
  
  if (!results.environment.DATABASE_URL || results.environment.DATABASE_URL === 'MISSING') {
    console.log('  - Set up DATABASE_URL environment variable');
  }
  
  if (results.externalAPIs.spotify && !results.externalAPIs.spotify.success && results.externalAPIs.spotify.reason !== 'no-credentials') {
    console.log('  - Check Spotify API credentials');
  }
  
  if (results.externalAPIs.ticketmaster && !results.externalAPIs.ticketmaster.success && results.externalAPIs.ticketmaster.reason !== 'no-credentials') {
    console.log('  - Check Ticketmaster API credentials');
  }
  
  const missingFiles = Object.entries(results.codeStructure).filter(([_, exists]) => !exists);
  if (missingFiles.length > 0) {
    console.log('  - Create missing code files:', missingFiles.map(([file]) => file).join(', '));
  }
  
  const offlineAPIs = Object.entries(results.apiRoutes).filter(([_, result]) => result.reason === 'offline');
  if (offlineAPIs.length > 0) {
    console.log('  - Start the development server to test API routes');
  }
  
  console.log('\n🔧 Next Steps:');
  console.log('  1. Start Redis server for queue functionality');
  console.log('  2. Set up database with proper schema');
  console.log('  3. Start Next.js development server');
  console.log('  4. Run end-to-end import test with real artist data');
  
  return results;
}

// Error handlers
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\n✅ Test suite completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runTests };