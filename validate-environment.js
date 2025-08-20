#!/usr/bin/env node

// Environment Validation Script for MySetlist Artist Import System
// This script validates all required environment variables and dependencies

const fs = require('fs');
const path = require('path');

console.log('🔍 MySetlist Environment Validation\n');

// Load environment variables
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#') && line.includes('=')) {
    const [key, ...rest] = line.split('=');
    const value = rest.join('=').replace(/^["']|["']$/g, '');
    process.env[key] = value;
  }
});

console.log('✅ Environment variables loaded from .env.local\n');

// Required environment variables
const requiredVars = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'TICKETMASTER_API_KEY',
  'SETLISTFM_API_KEY',
  'NEXTAUTH_SECRET',
  'REDIS_URL',
  'CRON_SECRET'
];

console.log('🔧 Required Environment Variables:');
let missingVars = 0;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value && value.trim() !== '') {
    console.log(`✅ ${varName}: SET`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
    missingVars++;
  }
});

console.log(`\n📊 Environment Status: ${requiredVars.length - missingVars}/${requiredVars.length} variables configured\n`);

// Check queue configuration
console.log('⚙️ Queue Configuration:');
const queueVars = ['QUEUE_CONCURRENCY', 'QUEUE_MAX_ATTEMPTS', 'QUEUE_BACKOFF_DELAY'];
queueVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`✅ ${varName}: ${value || 'default'}`);
});

console.log('\n🔗 API Keys Status:');
const apiKeys = [
  { name: 'Spotify', key: 'SPOTIFY_CLIENT_ID' },
  { name: 'Ticketmaster', key: 'TICKETMASTER_API_KEY' },
  { name: 'SetlistFM', key: 'SETLISTFM_API_KEY' }
];

apiKeys.forEach(api => {
  const key = process.env[api.key];
  if (key) {
    console.log(`✅ ${api.name}: ${key.substring(0, 8)}...`);
  } else {
    console.log(`❌ ${api.name}: NOT SET`);
  }
});

// Check package dependencies
console.log('\n📦 Dependency Verification:');
const requiredDeps = [
  { package: 'ioredis', path: 'node_modules/ioredis/package.json' },
  { package: 'bullmq', path: 'node_modules/bullmq/package.json' },
  { package: 'p-limit', path: 'node_modules/p-limit/package.json' }
];

requiredDeps.forEach(dep => {
  const webDepPath = path.join(__dirname, 'apps/web', dep.path);
  const queuesDepPath = path.join(__dirname, 'packages/queues', dep.path);
  
  const webExists = fs.existsSync(webDepPath);
  const queuesExists = fs.existsSync(queuesDepPath);
  
  if (webExists || queuesExists) {
    console.log(`✅ ${dep.package}: INSTALLED`);
  } else {
    console.log(`❌ ${dep.package}: MISSING`);
  }
});

// Feature flags status
console.log('\n🚀 Feature Flags:');
const features = [
  'NEXT_PUBLIC_ENABLE_SPOTIFY',
  'NEXT_PUBLIC_ENABLE_REALTIME', 
  'NEXT_PUBLIC_ENABLE_ANALYTICS'
];

features.forEach(feature => {
  const enabled = process.env[feature] === 'true';
  console.log(`${enabled ? '✅' : '❌'} ${feature.replace('NEXT_PUBLIC_ENABLE_', '')}: ${enabled ? 'ENABLED' : 'DISABLED'}`);
});

console.log('\n🏁 Environment Validation Complete!\n');

if (missingVars === 0) {
  console.log('🎉 All required environment variables are configured!');
  console.log('🚀 System is ready for artist import operations!');
  process.exit(0);
} else {
  console.log(`⚠️  ${missingVars} required environment variables are missing.`);
  console.log('❌ Please configure missing variables before proceeding.');
  process.exit(1);
}