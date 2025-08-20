/**
 * Basic Backend Readiness Test
 * Tests fundamental components without complex imports
 */

const { Redis } = require('ioredis');

async function testRedisConnection() {
  console.log('🔌 Testing Redis Connection...');
  
  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
    
    await redis.ping();
    await redis.set('test:basic', 'ok', 'EX', 10);
    const result = await redis.get('test:basic');
    
    if (result === 'ok') {
      console.log('✅ Redis: WORKING');
      await redis.del('test:basic');
      await redis.quit();
      return true;
    } else {
      throw new Error('Redis test failed');
    }
  } catch (error) {
    console.log(`❌ Redis: FAILED - ${error.message}`);
    return false;
  }
}

async function testEnvironment() {
  console.log('🔧 Testing Environment...');
  
  const checks = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
  };
  
  // Check key environment variables
  const envVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'REDIS_HOST', 
    'TICKETMASTER_API_KEY',
    'SPOTIFY_CLIENT_ID',
    'SPOTIFY_CLIENT_SECRET'
  ];
  
  const envStatus = {};
  envVars.forEach(key => {
    envStatus[key] = process.env[key] ? 'SET' : 'MISSING';
  });
  
  console.log('✅ Environment checks:');
  console.log('  Node version:', checks.nodeVersion);
  console.log('  Platform:', checks.platform);
  console.log('  Working directory:', checks.cwd);
  
  console.log('  Environment variables:');
  Object.entries(envStatus).forEach(([key, status]) => {
    const icon = status === 'SET' ? '✅' : '⚠️ ';
    console.log(`    ${icon} ${key}: ${status}`);
  });
  
  return envStatus;
}

async function testApiEndpoints() {
  console.log('🌐 Testing API Endpoints...');
  
  const endpoints = [
    'http://localhost:3000/api/health',
    'http://localhost:3000/api/infrastructure/test',
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        timeout: 3000,
      });
      
      const path = endpoint.split('/').pop();
      if (response.ok) {
        console.log(`✅ ${path}: RESPONDING (${response.status})`);
        results[path] = true;
      } else {
        console.log(`❌ ${path}: ERROR (${response.status})`);
        results[path] = false;
      }
    } catch (error) {
      const path = endpoint.split('/').pop();
      if (error.code === 'ECONNREFUSED') {
        console.log(`⚠️  ${path}: SERVER NOT RUNNING`);
        results[path] = 'offline';
      } else {
        console.log(`❌ ${path}: ERROR - ${error.message}`);
        results[path] = false;
      }
    }
  }
  
  return results;
}

async function testExternalAPIs() {
  console.log('🔗 Testing External APIs...');
  
  const results = {};
  
  // Test Spotify Authentication
  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      });
      
      if (response.ok) {
        console.log('✅ Spotify API: AUTHENTICATED');
        results.spotify = true;
      } else {
        console.log(`❌ Spotify API: AUTH FAILED (${response.status})`);
        results.spotify = false;
      }
    } catch (error) {
      console.log(`❌ Spotify API: ERROR - ${error.message}`);
      results.spotify = false;
    }
  } else {
    console.log('⚠️  Spotify API: NO CREDENTIALS');
    results.spotify = 'no-credentials';
  }
  
  // Test Ticketmaster API
  if (process.env.TICKETMASTER_API_KEY) {
    try {
      const response = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env.TICKETMASTER_API_KEY}&size=1`,
        { timeout: 5000 }
      );
      
      if (response.ok) {
        console.log('✅ Ticketmaster API: WORKING');
        results.ticketmaster = true;
      } else {
        console.log(`❌ Ticketmaster API: ERROR (${response.status})`);
        results.ticketmaster = false;
      }
    } catch (error) {
      console.log(`❌ Ticketmaster API: ERROR - ${error.message}`);
      results.ticketmaster = false;
    }
  } else {
    console.log('⚠️  Ticketmaster API: NO API KEY');
    results.ticketmaster = 'no-credentials';
  }
  
  return results;
}

async function testQueue() {
  console.log('⚙️  Testing Queue System...');
  
  try {
    const { Queue } = require('bullmq');
    
    const queue = new Queue('test-basic', {
      connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
      },
    });
    
    const job = await queue.add('test-job', { 
      test: true, 
      timestamp: Date.now() 
    });
    
    console.log('✅ Queue: JOB CREATED');
    
    // Clean up
    await job.remove();
    await queue.close();
    
    return true;
  } catch (error) {
    console.log(`❌ Queue: ERROR - ${error.message}`);
    return false;
  }
}

async function runBasicTests() {
  console.log('🚀 Backend Basic Readiness Test');
  console.log('===============================\n');
  
  const startTime = Date.now();
  
  const results = {
    environment: await testEnvironment(),
    redis: await testRedisConnection(),
    queue: await testQueue(),
    apiEndpoints: await testApiEndpoints(),
    externalAPIs: await testExternalAPIs(),
  };
  
  const duration = Date.now() - startTime;
  
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`Test Duration: ${duration}ms\n`);
  
  let totalChecks = 0;
  let passedChecks = 0;
  let warningChecks = 0;
  
  Object.entries(results).forEach(([category, result]) => {
    console.log(`${category.toUpperCase()}:`);
    
    if (typeof result === 'boolean') {
      totalChecks++;
      if (result) passedChecks++;
      console.log(`  ${result ? '✅' : '❌'} ${result ? 'PASSED' : 'FAILED'}`);
    } else if (typeof result === 'object') {
      Object.entries(result).forEach(([key, value]) => {
        totalChecks++;
        if (value === true) {
          passedChecks++;
          console.log(`  ✅ ${key}: PASSED`);
        } else if (value === 'offline' || value === 'no-credentials') {
          warningChecks++;
          console.log(`  ⚠️  ${key}: ${value.toUpperCase()}`);
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
  
  const readiness = (passedChecks / totalChecks) * 100;
  console.log(`\n🎯 Backend Readiness: ${readiness.toFixed(1)}%`);
  
  if (readiness >= 80) {
    console.log('🎉 Backend is READY for integration!');
  } else if (readiness >= 60) {
    console.log('⚠️  Backend needs some configuration but core systems work');
  } else {
    console.log('❌ Backend needs significant work before it\'s ready');
  }
  
  return results;
}

// Error handlers
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runBasicTests()
    .then(() => {
      console.log('\n✅ Basic test suite completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Basic test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runBasicTests };