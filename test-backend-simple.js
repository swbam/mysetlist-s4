/**
 * Simple Backend Integration Test (JavaScript)
 * Tests basic infrastructure components without TypeScript compilation
 */

const { createRedisClient } = require('./apps/web/lib/queues/redis-config');
const { Redis } = require('ioredis');

async function testRedisConnection() {
  console.log('🔌 Testing Redis Connection...');
  
  try {
    // Try to connect to Redis
    const client = createRedisClient();
    
    // Test basic operations
    await client.set('test:connection', 'ok', 'EX', 10);
    const result = await client.get('test:connection');
    
    if (result === 'ok') {
      console.log('✅ Redis connection: WORKING');
      await client.del('test:connection');
      await client.quit();
      return true;
    } else {
      throw new Error('Redis test failed');
    }
  } catch (error) {
    console.log(`❌ Redis connection: FAILED - ${error.message}`);
    return false;
  }
}

async function testEnvironmentVariables() {
  console.log('🔧 Testing Environment Variables...');
  
  const requiredVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'TICKETMASTER_API_KEY', 
    'SPOTIFY_CLIENT_ID',
    'SPOTIFY_CLIENT_SECRET'
  ];
  
  const missingVars = [];
  const presentVars = [];
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      presentVars.push(varName);
    } else {
      missingVars.push(varName);
    }
  });
  
  console.log(`✅ Present variables: ${presentVars.length}/${requiredVars.length}`);
  if (missingVars.length > 0) {
    console.log(`⚠️  Missing variables: ${missingVars.join(', ')}`);
  }
  
  return missingVars.length === 0;
}

async function testQueueConfiguration() {
  console.log('⚙️  Testing Queue Configuration...');
  
  try {
    const { Queue } = require('bullmq');
    const { bullMQConnection } = require('./apps/web/lib/queues/redis-config');
    
    // Try to create a test queue
    const testQueue = new Queue('test-queue', {
      connection: bullMQConnection,
    });
    
    // Add a test job
    const job = await testQueue.add('test-job', { test: true });
    console.log(`✅ Queue job created with ID: ${job.id}`);
    
    // Clean up
    await job.remove();
    await testQueue.close();
    
    return true;
  } catch (error) {
    console.log(`❌ Queue configuration: FAILED - ${error.message}`);
    return false;
  }
}

async function testApiConnectivity() {
  console.log('🌐 Testing API Connectivity...');
  
  // Test localhost connectivity
  try {
    const response = await fetch('http://localhost:3000/api/health', {
      method: 'GET',
      timeout: 5000,
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Local API server: RESPONSIVE');
      return true;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  Local API server: NOT RUNNING (this is OK for testing)');
    } else {
      console.log(`❌ Local API server: ERROR - ${error.message}`);
    }
    return false;
  }
}

async function testExternalApis() {
  console.log('🔗 Testing External API Keys...');
  
  const results = {};
  
  // Test Spotify (just auth endpoint)
  try {
    const spotifyResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });
    
    if (spotifyResponse.status === 200) {
      console.log('✅ Spotify API: AUTHENTICATED');
      results.spotify = true;
    } else {
      console.log(`❌ Spotify API: AUTH FAILED (${spotifyResponse.status})`);
      results.spotify = false;
    }
  } catch (error) {
    console.log(`❌ Spotify API: ERROR - ${error.message}`);
    results.spotify = false;
  }
  
  // Test Ticketmaster (simple request)
  try {
    const tmResponse = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env.TICKETMASTER_API_KEY}&size=1`
    );
    
    if (tmResponse.status === 200) {
      console.log('✅ Ticketmaster API: WORKING');
      results.ticketmaster = true;
    } else {
      console.log(`❌ Ticketmaster API: ERROR (${tmResponse.status})`);
      results.ticketmaster = false;
    }
  } catch (error) {
    console.log(`❌ Ticketmaster API: ERROR - ${error.message}`);
    results.ticketmaster = false;
  }
  
  return results;
}

async function runAllTests() {
  console.log('🚀 Backend Integration Test Suite');
  console.log('=================================\n');
  
  const results = {
    environment: await testEnvironmentVariables(),
    redis: await testRedisConnection(),
    queues: await testQueueConfiguration(),
    apiConnectivity: await testApiConnectivity(),
    externalApis: await testExternalApis(),
  };
  
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  
  const totalTests = Object.keys(results).length;
  let passedTests = 0;
  
  Object.entries(results).forEach(([test, result]) => {
    if (typeof result === 'object') {
      const subTests = Object.values(result);
      const subPassed = subTests.filter(Boolean).length;
      console.log(`${test}: ${subPassed}/${subTests.length} passed`);
      if (subPassed === subTests.length) passedTests++;
    } else {
      console.log(`${test}: ${result ? 'PASSED' : 'FAILED'}`);
      if (result) passedTests++;
    }
  });
  
  console.log(`\nOverall: ${passedTests}/${totalTests} components working`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All backend systems are ready!');
  } else {
    console.log('⚠️  Some backend components need attention');
  }
  
  return results;
}

// Run the tests
runAllTests()
  .then(() => {
    console.log('\n✅ Test suite completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });