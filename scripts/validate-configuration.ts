import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

interface ValidationResult {
  variable: string;
  status: 'present' | 'missing';
  value?: string;
  required: boolean;
}

const requiredVariables = [
  // Core Supabase
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  
  // Authentication
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  
  // External APIs
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'TICKETMASTER_API_KEY',
  'SETLISTFM_API_KEY',
  
  // Security
  'INTERNAL_API_KEY',
];

const optionalVariables = [
  // Monitoring
  'SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
  'POSTHOG_API_KEY',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_POSTHOG_HOST',
  
  // Email
  'RESEND_API_KEY',
  'EMAIL_FROM',
  
  // Feature flags
  'NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID',
  'FLAGSMITH_ENVIRONMENT_KEY',
  
  // Performance
  'VERCEL_FORCE_NO_BUILD_CACHE',
  'ANALYZE',
  
  // Admin
  'ADMIN_SECRET',
  'WEBHOOK_SECRET',
  'ENCRYPTION_KEY',
];

function validateConfiguration(): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Check required variables
  for (const variable of requiredVariables) {
    const value = process.env[variable];
    results.push({
      variable,
      status: value ? 'present' : 'missing',
      value: value ? '***' : undefined,
      required: true,
    });
  }
  
  // Check optional variables
  for (const variable of optionalVariables) {
    const value = process.env[variable];
    results.push({
      variable,
      status: value ? 'present' : 'missing',
      value: value ? '***' : undefined,
      required: false,
    });
  }
  
  return results;
}

function printResults(results: ValidationResult[]) {
  console.log('\n🔍 MySetlist Configuration Validation\n');
  
  const requiredMissing = results.filter(r => r.required && r.status === 'missing');
  const optionalMissing = results.filter(r => !r.required && r.status === 'missing');
  
  console.log('📋 Required Variables:');
  results
    .filter(r => r.required)
    .forEach(r => {
      const icon = r.status === 'present' ? '✅' : '❌';
      console.log(`  ${icon} ${r.variable}`);
    });
  
  console.log('\n📋 Optional Variables:');
  results
    .filter(r => !r.required)
    .forEach(r => {
      const icon = r.status === 'present' ? '✅' : '⚠️';
      console.log(`  ${icon} ${r.variable}`);
    });
  
  console.log('\n📊 Summary:');
  console.log(`  Required: ${requiredVariables.length - requiredMissing.length}/${requiredVariables.length} configured`);
  console.log(`  Optional: ${optionalVariables.length - optionalMissing.length}/${optionalVariables.length} configured`);
  
  if (requiredMissing.length > 0) {
    console.log('\n❌ Missing Required Variables:');
    requiredMissing.forEach(r => {
      console.log(`  - ${r.variable}`);
    });
    console.log('\n⚠️  Your application will not function properly without these variables!');
    console.log('   Run ./scripts/generate-secure-secrets.sh to generate the necessary secrets.');
    process.exit(1);
  } else {
    console.log('\n✅ All required environment variables are configured!');
  }
  
  if (optionalMissing.length > 0) {
    console.log('\n⚠️  Optional variables not configured (app will work but some features may be limited):');
    optionalMissing.forEach(r => {
      console.log(`  - ${r.variable}`);
    });
  }
}

// Run validation
const results = validateConfiguration();
printResults(results);