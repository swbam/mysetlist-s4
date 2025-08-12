#!/usr/bin/env node

/**
 * Environment Variables Verification Script
 * Checks that all required environment variables are properly configured
 */

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Required environment variables
const ENV_VARS = {
  // Core App
  NEXT_PUBLIC_APP_URL: {
    value: process.env.NEXT_PUBLIC_APP_URL,
    required: false,
    description: 'Application URL'
  },
  
  // Database
  NEXT_PUBLIC_SUPABASE_URL: {
    value: process.env.NEXT_PUBLIC_SUPABASE_URL,
    required: true,
    description: 'Supabase project URL'
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    required: true,
    description: 'Supabase anonymous key'
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    value: process.env.SUPABASE_SERVICE_ROLE_KEY,
    required: true,
    description: 'Supabase service role key'
  },
  
  // Security
  CRON_SECRET: {
    value: process.env.CRON_SECRET,
    required: true,
    description: 'Secret for cron job authentication'
  },
  
  // External APIs
  SPOTIFY_CLIENT_ID: {
    value: process.env.SPOTIFY_CLIENT_ID,
    required: true,
    description: 'Spotify API client ID'
  },
  SPOTIFY_CLIENT_SECRET: {
    value: process.env.SPOTIFY_CLIENT_SECRET,
    required: true,
    description: 'Spotify API client secret'
  },
  TICKETMASTER_API_KEY: {
    value: process.env.TICKETMASTER_API_KEY,
    required: true,
    description: 'Ticketmaster API key'
  },
  SETLISTFM_API_KEY: {
    value: process.env.SETLISTFM_API_KEY,
    required: true,
    description: 'Setlist.fm API key'
  }
};

function checkEnvironmentVariables() {
  console.log('🔧 Environment Variables Check');
  console.log('=' .repeat(50));
  console.log('');

  let allValid = true;
  const missing = [];
  const present = [];

  for (const [key, config] of Object.entries(ENV_VARS)) {
    const hasValue = !!config.value;
    const status = hasValue ? '✅' : (config.required ? '❌' : '⚠️ ');
    
    console.log(`${status} ${key}`);
    console.log(`   ${config.description}`);
    console.log(`   Required: ${config.required ? 'Yes' : 'No'}`);
    console.log(`   Present: ${hasValue ? 'Yes' : 'No'}`);
    
    if (hasValue) {
      // Show partial value for security
      const displayValue = config.value.length > 20 
        ? config.value.substring(0, 10) + '...' + config.value.substring(config.value.length - 5)
        : config.value.substring(0, 10) + '...';
      console.log(`   Value: ${displayValue}`);
      present.push(key);
    } else {
      if (config.required) {
        allValid = false;
        missing.push(key);
      }
    }
    console.log('');
  }

  return { allValid, missing, present };
}

async function testSupabaseConnection() {
  console.log('🗄️  Testing Supabase Connection');
  console.log('=' .repeat(50));
  console.log('');

  if (!ENV_VARS.NEXT_PUBLIC_SUPABASE_URL.value || !ENV_VARS.SUPABASE_SERVICE_ROLE_KEY.value) {
    console.log('❌ Missing Supabase credentials');
    return false;
  }

  try {
    const supabase = createClient(
      ENV_VARS.NEXT_PUBLIC_SUPABASE_URL.value,
      ENV_VARS.SUPABASE_SERVICE_ROLE_KEY.value
    );

    // Test connection with a simple query
    const { data, error } = await supabase
      .from('artists')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Supabase connection failed:', error.message);
      return false;
    } else {
      console.log('✅ Supabase connection successful');
      console.log(`   Artists table has ${data || 0} records`);
      return true;
    }
  } catch (error) {
    console.log('❌ Supabase connection error:', error.message);
    return false;
  }
}

async function testExternalAPIs() {
  console.log('🌐 Testing External API Keys');
  console.log('=' .repeat(50));
  console.log('');

  const results = {};

  // Test Spotify API
  if (ENV_VARS.SPOTIFY_CLIENT_ID.value && ENV_VARS.SPOTIFY_CLIENT_SECRET.value) {
    try {
      console.log('🎵 Testing Spotify API...');
      
      // Get access token
      const authResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${ENV_VARS.SPOTIFY_CLIENT_ID.value}:${ENV_VARS.SPOTIFY_CLIENT_SECRET.value}`
          ).toString('base64')}`
        },
        body: 'grant_type=client_credentials'
      });

      if (authResponse.ok) {
        const authData = await authResponse.json();
        console.log('✅ Spotify API credentials valid');
        results.spotify = true;
      } else {
        console.log('❌ Spotify API credentials invalid');
        results.spotify = false;
      }
    } catch (error) {
      console.log('❌ Spotify API test failed:', error.message);
      results.spotify = false;
    }
  } else {
    console.log('⚠️  Spotify API credentials missing');
    results.spotify = false;
  }

  // Test Ticketmaster API
  if (ENV_VARS.TICKETMASTER_API_KEY.value) {
    try {
      console.log('🎫 Testing Ticketmaster API...');
      
      const response = await fetch(
        `https://app.ticketmaster.com/discovery/v2/attractions.json?apikey=${ENV_VARS.TICKETMASTER_API_KEY.value}&size=1`
      );

      if (response.ok) {
        console.log('✅ Ticketmaster API key valid');
        results.ticketmaster = true;
      } else {
        console.log('❌ Ticketmaster API key invalid');
        results.ticketmaster = false;
      }
    } catch (error) {
      console.log('❌ Ticketmaster API test failed:', error.message);
      results.ticketmaster = false;
    }
  } else {
    console.log('⚠️  Ticketmaster API key missing');
    results.ticketmaster = false;
  }

  // Test Setlist.fm API
  if (ENV_VARS.SETLISTFM_API_KEY.value) {
    try {
      console.log('🎼 Testing Setlist.fm API...');
      
      const response = await fetch(
        'https://api.setlist.fm/rest/1.0/search/setlists?artistName=test&p=1',
        {
          headers: {
            'x-api-key': ENV_VARS.SETLISTFM_API_KEY.value,
            'Accept': 'application/json'
          }
        }
      );

      if (response.ok) {
        console.log('✅ Setlist.fm API key valid');
        results.setlistfm = true;
      } else {
        console.log('❌ Setlist.fm API key invalid');
        results.setlistfm = false;
      }
    } catch (error) {
      console.log('❌ Setlist.fm API test failed:', error.message);
      results.setlistfm = false;
    }
  } else {
    console.log('⚠️  Setlist.fm API key missing');
    results.setlistfm = false;
  }

  console.log('');
  return results;
}

async function runAllChecks() {
  console.log('🚀 MySetlist Environment Configuration Check');
  console.log('');

  // Check environment variables
  const envCheck = checkEnvironmentVariables();
  
  // Test Supabase connection
  const supabaseCheck = await testSupabaseConnection();
  console.log('');
  
  // Test external APIs
  const apiChecks = await testExternalAPIs();
  
  // Summary
  console.log('📊 Summary');
  console.log('=' .repeat(50));
  console.log(`Environment Variables: ${envCheck.allValid ? '✅ Valid' : '❌ Issues'}`);
  if (envCheck.missing.length > 0) {
    console.log(`   Missing required: ${envCheck.missing.join(', ')}`);
  }
  
  console.log(`Supabase Connection: ${supabaseCheck ? '✅ Working' : '❌ Failed'}`);
  
  const apiResults = Object.entries(apiChecks).map(([api, success]) => 
    `${api}: ${success ? '✅' : '❌'}`
  ).join(', ');
  console.log(`External APIs: ${apiResults}`);
  
  const allGood = envCheck.allValid && supabaseCheck && Object.values(apiChecks).some(Boolean);
  
  console.log('');
  if (allGood) {
    console.log('🎉 Environment configuration looks good!');
  } else {
    console.log('⚠️  Some configuration issues found. Please check the details above.');
  }
  
  return allGood;
}

// Run if called directly
if (require.main === module) {
  runAllChecks()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Environment check error:', error);
      process.exit(1);
    });
}

module.exports = { runAllChecks, checkEnvironmentVariables };