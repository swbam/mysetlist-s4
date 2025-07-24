#!/usr/bin/env tsx
/**
 * Comprehensive environment variable validation for deployment
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
const envPaths = [
  '.env.local',
  '.env.production',
  '.env',
  'apps/web/.env.local',
  'apps/web/.env.production',
];

for (const path of envPaths) {
  if (existsSync(path)) {
    dotenv.config({ path, override: false });
  }
}

interface EnvVariable {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
  example?: string;
}

const ENV_VARIABLES: EnvVariable[] = [
  // Database
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL connection string',
    validator: (val) => val.startsWith('postgres://') || val.startsWith('postgresql://'),
    example: 'postgresql://user:pass@host:5432/dbname?sslmode=require',
  },
  {
    name: 'DIRECT_URL',
    required: false,
    description: 'Direct database URL (for migrations)',
    validator: (val) => val.startsWith('postgres://') || val.startsWith('postgresql://'),
  },
  
  // Supabase
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validator: (val) => val.startsWith('https://') && val.includes('.supabase.co'),
    example: 'https://xxxxx.supabase.co',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key',
    validator: (val) => val.length > 50,
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key',
    validator: (val) => val.length > 50,
  },
  {
    name: 'SUPABASE_JWT_SECRET',
    required: true,
    description: 'Supabase JWT secret',
    validator: (val) => val.length > 30,
  },
  
  // External APIs
  {
    name: 'SPOTIFY_CLIENT_ID',
    required: true,
    description: 'Spotify API client ID',
    validator: (val) => val.length === 32,
  },
  {
    name: 'SPOTIFY_CLIENT_SECRET',
    required: true,
    description: 'Spotify API client secret',
    validator: (val) => val.length === 32,
  },
  {
    name: 'TICKETMASTER_API_KEY',
    required: true,
    description: 'Ticketmaster API key',
    validator: (val) => val.length > 20,
  },
  {
    name: 'SETLISTFM_API_KEY',
    required: true,
    description: 'Setlist.fm API key',
    validator: (val) => val.length > 20,
  },
  
  // Security
  {
    name: 'CRON_SECRET',
    required: true,
    description: 'Secret for cron job authentication',
    validator: (val) => val.length >= 32,
  },
  {
    name: 'NEXTAUTH_SECRET',
    required: true,
    description: 'NextAuth.js secret',
    validator: (val) => val.length >= 32,
  },
  
  // Application URLs
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: true,
    description: 'Application URL',
    validator: (val) => val.startsWith('http://') || val.startsWith('https://'),
    example: 'https://mysetlist.vercel.app',
  },
  
  // Optional but recommended
  {
    name: 'SENTRY_DSN',
    required: false,
    description: 'Sentry error tracking DSN',
    validator: (val) => val.startsWith('https://') && val.includes('@'),
  },
  {
    name: 'POSTHOG_API_KEY',
    required: false,
    description: 'PostHog analytics API key',
  },
];

interface ValidationResult {
  valid: boolean;
  missing: string[];
  invalid: string[];
  warnings: string[];
}

function validateEnvironment(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    missing: [],
    invalid: [],
    warnings: [],
  };

  console.log('🔍 Validating environment variables for deployment...\n');

  for (const envVar of ENV_VARIABLES) {
    const value = process.env[envVar.name];
    
    if (!value && envVar.required) {
      result.missing.push(envVar.name);
      result.valid = false;
      console.log(`❌ ${envVar.name}: Missing (${envVar.description})`);
      if (envVar.example) {
        console.log(`   Example: ${envVar.example}`);
      }
    } else if (value && envVar.validator && !envVar.validator(value)) {
      result.invalid.push(envVar.name);
      result.valid = false;
      console.log(`❌ ${envVar.name}: Invalid format`);
      if (envVar.example) {
        console.log(`   Example: ${envVar.example}`);
      }
    } else if (value) {
      console.log(`✅ ${envVar.name}: Valid`);
    } else if (!envVar.required) {
      result.warnings.push(`${envVar.name} is not set (optional)`);
    }
  }

  // Additional checks
  console.log('\n📋 Additional deployment checks:\n');

  // Check database SSL
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && !dbUrl.includes('sslmode=require')) {
    result.warnings.push('DATABASE_URL should include sslmode=require for production');
    console.log('⚠️  DATABASE_URL should include sslmode=require for production');
  } else {
    console.log('✅ Database SSL mode configured');
  }

  // Check Vercel deployment
  if (process.env.VERCEL) {
    console.log('✅ Running in Vercel environment');
  } else {
    console.log('ℹ️  Not running in Vercel environment');
  }

  // Check Node version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  if (majorVersion >= 18) {
    console.log(`✅ Node.js version: ${nodeVersion}`);
  } else {
    result.warnings.push(`Node.js version ${nodeVersion} is below recommended v18+`);
    console.log(`⚠️  Node.js version ${nodeVersion} is below recommended v18+`);
  }

  // Summary
  console.log('\n📊 Validation Summary:');
  console.log(`   Total checked: ${ENV_VARIABLES.length}`);
  console.log(`   Missing: ${result.missing.length}`);
  console.log(`   Invalid: ${result.invalid.length}`);
  console.log(`   Warnings: ${result.warnings.length}`);

  if (!result.valid) {
    console.log('\n❌ Environment validation failed!');
    console.log('   Please set all required environment variables before deployment.');
  } else {
    console.log('\n✅ Environment validation passed!');
  }

  return result;
}

// Test API connections if requested
async function testApiConnections() {
  console.log('\n🔌 Testing API connections...\n');

  // Test Supabase
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    });
    if (response.ok) {
      console.log('✅ Supabase connection successful');
    } else {
      console.log(`❌ Supabase connection failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Supabase connection error: ${error.message}`);
  }

  // Test Spotify
  try {
    const authString = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    
    if (response.ok) {
      console.log('✅ Spotify API connection successful');
    } else {
      console.log(`❌ Spotify API connection failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Spotify API connection error: ${error.message}`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const testApis = args.includes('--test-apis');
  
  const result = validateEnvironment();
  
  if (testApis) {
    await testApiConnections();
  }
  
  // Exit with error code if validation failed
  if (!result.valid) {
    process.exit(1);
  }
}

main().catch(console.error);