#!/usr/bin/env node

/**
 * AGENT 5: RUNTIME & INTEGRATION SYSTEMS ANALYZER
 * Comprehensive test script for testing all runtime functionality
 */

require('dotenv').config({ path: './.env.local' });
const https = require('https');
const http = require('http');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test configuration
const tests = {
  environment: testEnvironmentVariables,
  spotify: testSpotifyAPI,
  ticketmaster: testTicketmasterAPI,
  setlistfm: testSetlistFMAPI,
  redis: testRedisConnectivity,
  database: testDatabaseConnectivity
};

async function main() {
  log('\n🚀 AGENT 5: RUNTIME & INTEGRATION SYSTEMS ANALYZER', 'bright');
  log('=' * 80, 'blue');
  log('\nTesting all runtime functionality and integrations...\n', 'blue');

  const results = {};
  
  for (const [testName, testFunction] of Object.entries(tests)) {
    log(`\n🔍 Testing ${testName}...`, 'yellow');
    try {
      const result = await testFunction();
      results[testName] = result;
      log(`✅ ${testName}: ${result.status}`, result.success ? 'green' : 'red');
      if (result.details) {
        log(`   Details: ${result.details}`, 'blue');
      }
    } catch (error) {
      results[testName] = { success: false, status: 'ERROR', error: error.message };
      log(`❌ ${testName}: ERROR - ${error.message}`, 'red');
    }
  }

  // Generate summary report
  generateReport(results);
}

function testEnvironmentVariables() {
  const requiredVars = [
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SPOTIFY_CLIENT_ID',
    'SPOTIFY_CLIENT_SECRET',
    'TICKETMASTER_API_KEY',
    'SETLISTFM_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    return {
      success: false,
      status: 'MISSING VARIABLES',
      details: `Missing: ${missing.join(', ')}`
    };
  }

  return {
    success: true,
    status: 'ALL VARIABLES PRESENT',
    details: `${requiredVars.length} variables configured`
  };
}

async function testSpotifyAPI() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { success: false, status: 'CREDENTIALS MISSING' };
  }

  return new Promise((resolve) => {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const postData = 'grant_type=client_credentials';

    const options = {
      hostname: 'accounts.spotify.com',
      path: '/api/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) {
            resolve({ success: true, status: 'CONNECTED', details: 'Access token obtained' });
          } else {
            resolve({ success: false, status: 'AUTH FAILED', details: data });
          }
        } catch (e) {
          resolve({ success: false, status: 'PARSE ERROR', details: e.message });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ success: false, status: 'REQUEST FAILED', details: e.message });
    });

    req.setTimeout(10000, () => {
      resolve({ success: false, status: 'TIMEOUT' });
    });

    req.write(postData);
    req.end();
  });
}

async function testTicketmasterAPI() {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    return { success: false, status: 'API KEY MISSING' };
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'app.ticketmaster.com',
      path: `/discovery/v2/events.json?apikey=${apiKey}&size=1`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.fault) {
            resolve({ success: false, status: 'API ERROR', details: parsed.fault.faultstring });
          } else if (parsed._embedded || parsed.page) {
            resolve({ success: true, status: 'CONNECTED', details: 'API responding' });
          } else {
            resolve({ success: false, status: 'UNEXPECTED RESPONSE', details: data.substring(0, 100) });
          }
        } catch (e) {
          resolve({ success: false, status: 'PARSE ERROR', details: e.message });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ success: false, status: 'REQUEST FAILED', details: e.message });
    });

    req.setTimeout(10000, () => {
      resolve({ success: false, status: 'TIMEOUT' });
    });

    req.end();
  });
}

async function testSetlistFMAPI() {
  const apiKey = process.env.SETLISTFM_API_KEY;

  if (!apiKey) {
    return { success: false, status: 'API KEY MISSING' };
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.setlist.fm',
      path: '/rest/1.0/search/artists?artistName=coldplay&p=1&sort=relevance',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, status: 'CONNECTED', details: 'API responding' });
        } else {
          resolve({ success: false, status: `HTTP ${res.statusCode}`, details: data.substring(0, 100) });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ success: false, status: 'REQUEST FAILED', details: e.message });
    });

    req.setTimeout(10000, () => {
      resolve({ success: false, status: 'TIMEOUT' });
    });

    req.end();
  });
}

async function testRedisConnectivity() {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !token) {
    return { success: false, status: 'CREDENTIALS MISSING' };
  }

  return new Promise((resolve) => {
    const url = new URL(`${redisUrl}/ping`);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 && data.includes('PONG')) {
          resolve({ success: true, status: 'CONNECTED', details: 'Redis responding' });
        } else {
          resolve({ success: false, status: `HTTP ${res.statusCode}`, details: data });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ success: false, status: 'REQUEST FAILED', details: e.message });
    });

    req.setTimeout(10000, () => {
      resolve({ success: false, status: 'TIMEOUT' });
    });

    req.end();
  });
}

async function testDatabaseConnectivity() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, status: 'CREDENTIALS MISSING' };
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase.from('artists').select('id').limit(1);
    
    if (error) {
      return { success: false, status: 'QUERY FAILED', details: error.message };
    }

    return { success: true, status: 'CONNECTED', details: 'Database query successful' };
  } catch (error) {
    return { success: false, status: 'CONNECTION FAILED', details: error.message };
  }
}

function generateReport(results) {
  log('\n📊 COMPREHENSIVE RUNTIME SYSTEM REPORT', 'bright');
  log('=' * 80, 'blue');
  
  const successful = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;
  
  log(`\n🎯 Overall Status: ${successful}/${total} systems operational`, successful === total ? 'green' : 'red');
  
  log('\n📋 Detailed Results:', 'blue');
  for (const [system, result] of Object.entries(results)) {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`${icon} ${system.toUpperCase()}: ${result.status}`, color);
    if (result.details) {
      log(`   └─ ${result.details}`, 'blue');
    }
    if (result.error) {
      log(`   └─ Error: ${result.error}`, 'red');
    }
  }

  // Analysis and recommendations
  log('\n🔍 ANALYSIS & RECOMMENDATIONS:', 'yellow');
  
  if (!results.environment.success) {
    log('⚠️  Environment variables are missing - check .env.local configuration', 'red');
  }
  
  if (!results.spotify.success) {
    log('⚠️  Spotify API connectivity issues - artist data sync will fail', 'red');
  }
  
  if (!results.ticketmaster.success) {
    log('⚠️  Ticketmaster API connectivity issues - show data sync will fail', 'red');
  }
  
  if (!results.redis.success) {
    log('⚠️  Redis connectivity issues - queue system will fail', 'red');
  }
  
  if (!results.database.success) {
    log('⚠️  Database connectivity issues - all operations will fail', 'red');
  }

  // Queue system analysis
  log('\n🔄 QUEUE SYSTEM ANALYSIS:', 'yellow');
  log('📊 Current Implementation: SimpleQueue (Upstash Redis)', 'blue');
  log('📊 Expected Queues: 14 queues defined in queue-manager.ts', 'blue');
  log('📊 GROK.md mentions: BullMQ system (not currently implemented)', 'yellow');
  log('⚠️  Discrepancy: Documentation shows BullMQ but code uses SimpleQueue', 'red');

  log('\n🚀 NEXT STEPS:', 'bright');
  log('1. Fix API credentials and connectivity issues', 'yellow');
  log('2. Test queue workers initialization', 'yellow');
  log('3. Verify SSE functionality for real-time progress', 'yellow');
  log('4. Test complete artist import workflow', 'yellow');
  log('5. Monitor queue processing and error handling', 'yellow');

  log('\n' + '=' * 80, 'blue');
  log('🎉 Runtime analysis complete!', 'green');
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  log('\n🛑 Analysis interrupted by user', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n🛑 Analysis terminated', 'yellow');
  process.exit(0);
});

main().catch(console.error);