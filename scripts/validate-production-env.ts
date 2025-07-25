/**
 * Production Environment Validation Script
 * Validates all required environment variables for production deployment
 */

// Simple validation without external dependencies
const requiredEnvVars = {
  // Core Application URLs
  'NEXT_PUBLIC_APP_URL': 'URL',
  'NEXT_PUBLIC_WEB_URL': 'URL', 
  'NEXT_PUBLIC_API_URL': 'URL',
  'NODE_ENV': 'production',

  // Supabase Configuration (Critical)
  'NEXT_PUBLIC_SUPABASE_URL': 'URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'string',
  'SUPABASE_SERVICE_ROLE_KEY': 'string',
  'SUPABASE_JWT_SECRET': 'string',
  'DATABASE_URL': 'URL',

  // Authentication (Critical)
  'NEXTAUTH_SECRET': 'string',
  'NEXTAUTH_URL': 'URL',

  // External APIs (Required for functionality)
  'SPOTIFY_CLIENT_ID': 'string',
  'SPOTIFY_CLIENT_SECRET': 'string',
  'NEXT_PUBLIC_SPOTIFY_CLIENT_ID': 'string',
  'TICKETMASTER_API_KEY': 'string',
  'SETLISTFM_API_KEY': 'string',

  // Security
  'CSRF_SECRET': 'string',
  'CRON_SECRET': 'string'
};

const optionalEnvVars = {
  'ADMIN_USER_IDS': 'string',
  'RESEND_API_KEY': 'string',
  'NEXT_PUBLIC_POSTHOG_KEY': 'string',
  'NEXT_PUBLIC_SENTRY_DSN': 'URL',
  'UPSTASH_REDIS_REST_URL': 'URL',
  'UPSTASH_REDIS_REST_TOKEN': 'string',
  'NEXT_PUBLIC_ENABLE_SPOTIFY': 'string',
  'NEXT_PUBLIC_ENABLE_REALTIME': 'string',
  'NEXT_PUBLIC_ENABLE_ANALYTICS': 'string'
};

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
  configured: string[];
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

function validateProductionEnvironment(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    missing: [],
    configured: []
  };

  console.log('🔍 Validating Production Environment Variables...\n');

  // Get all environment variables
  const env = process.env;

  // Check required variables
  Object.entries(requiredEnvVars).forEach(([key, type]) => {
    const value = env[key];
    
    if (!value) {
      result.missing.push(key);
      result.errors.push(`❌ MISSING: ${key} is required for production`);
      result.valid = false;
    } else {
      // Validate type
      if (type === 'URL' && !isValidUrl(value)) {
        result.errors.push(`❌ INVALID: ${key} must be a valid URL, got: ${value}`);
        result.valid = false;
      } else if (type === 'production' && value !== 'production') {
        result.errors.push(`❌ INVALID: ${key} must be 'production', got: ${value}`);
        result.valid = false;
      } else if (type === 'string' && value.length < 8) {
        result.warnings.push(`⚠️  ${key} seems too short for security (${value.length} chars)`);
      }
      
      result.configured.push(key);
    }
  });

  // Check optional variables
  Object.entries(optionalEnvVars).forEach(([key, type]) => {
    const value = env[key];
    if (value) {
      if (type === 'URL' && !isValidUrl(value)) {
        result.warnings.push(`⚠️  ${key} should be a valid URL, got: ${value}`);
      }
      result.configured.push(key);
    }
  });

  // Check critical database connectivity
  if (env.DATABASE_URL && !env.DATABASE_URL.includes('localhost')) {
    result.configured.push('Database Connection (External)');
  } else if (env.DATABASE_URL?.includes('localhost')) {
    result.warnings.push('⚠️  Database appears to be localhost - ensure production DB is configured');
  }

  // Check URL consistency
  if (env.NEXT_PUBLIC_APP_URL && env.NEXTAUTH_URL) {
    if (env.NEXT_PUBLIC_APP_URL !== env.NEXTAUTH_URL) {
      result.warnings.push('⚠️  NEXT_PUBLIC_APP_URL and NEXTAUTH_URL should match in production');
    }
  }

  // Check for development values in production
  const developmentIndicators = ['localhost', 'dev', 'test'];
  Object.entries(env).forEach(([key, value]) => {
    if (value && developmentIndicators.some(indicator => 
      value.toLowerCase().includes(indicator) && 
      key.includes('PUBLIC') && 
      !key.includes('DEBUG')
    )) {
      result.warnings.push(`⚠️  ${key} contains development values: ${value}`);
    }
  });

  return result;
}

function checkDeploymentReadiness(): void {
  console.log('🚀 MySetlist Production Deployment Readiness Check\n');
  console.log('=' .repeat(60));
  
  const validation = validateProductionEnvironment();
  
  console.log('\n📊 VALIDATION RESULTS:');
  console.log(`✅ Configured Variables: ${validation.configured.length}`);
  console.log(`❌ Missing Variables: ${validation.missing.length}`);
  console.log(`⚠️  Warnings: ${validation.warnings.length}`);
  
  if (validation.configured.length > 0) {
    console.log('\n✅ CONFIGURED VARIABLES:');
    validation.configured.forEach(variable => {
      console.log(`  ✓ ${variable}`);
    });
  }

  if (validation.errors.length > 0) {
    console.log('\n❌ ERRORS (Must fix before deployment):');
    validation.errors.forEach(error => {
      console.log(`  ${error}`);
    });
  }

  if (validation.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (Recommended fixes):');
    validation.warnings.forEach(warning => {
      console.log(`  ${warning}`);
    });
  }

  // Overall status
  console.log('\n' + '='.repeat(60));
  
  if (validation.valid && validation.errors.length === 0) {
    console.log('🎉 READY FOR DEPLOYMENT!');
    console.log('All critical environment variables are properly configured.');
    
    if (validation.warnings.length > 0) {
      console.log('Consider addressing warnings for optimal production setup.');
    }
    
    console.log('\nNext steps:');
    console.log('1. Ensure these variables are set in Vercel Environment Variables');
    console.log('2. Set Environment scope to "Production" for sensitive variables');
    console.log('3. Deploy to production');
    
    process.exit(0);
  } else {
    console.log('❌ NOT READY FOR DEPLOYMENT');
    console.log('Please fix the errors above before deploying to production.');
    
    console.log('\nFor Vercel deployment:');
    console.log('1. Go to Vercel Project Settings > Environment Variables');
    console.log('2. Add each missing variable with production values');
    console.log('3. Set appropriate environment scopes (Production/Preview/Development)');
    
    process.exit(1);
  }
}

// Run the check
if (import.meta.url === `file://${process.argv[1]}`) {
  checkDeploymentReadiness();
}

export { validateProductionEnvironment, checkDeploymentReadiness };