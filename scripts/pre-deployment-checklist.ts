#!/usr/bin/env tsx

/**
 * Pre-Deployment Checklist Script
 * 
 * This script performs comprehensive checks before deployment to ensure:
 * - All environment variables are properly configured
 * - Database connection is established
 * - Build completes without errors
 * - All critical configurations are in place
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, access } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const execAsync = promisify(exec);

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.production' });

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Logging utilities
const log = {
  info: (msg: string) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}[✓]${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}[!]${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}[✗]${colors.reset} ${msg}`),
  section: (msg: string) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}`),
};

// Check results tracking
interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

const results: CheckResult[] = [];

// Add result to tracking
function addResult(name: string, status: 'pass' | 'fail' | 'warning', message: string, details?: string) {
  results.push({ name, status, message, details });
  
  if (status === 'pass') {
    log.success(message);
  } else if (status === 'warning') {
    log.warning(message);
  } else {
    log.error(message);
  }
  
  if (details) {
    console.log(`    ${colors.yellow}→${colors.reset} ${details}`);
  }
}

// Required environment variables
const requiredEnvVars = [
  // Core Next.js
  'NEXT_PUBLIC_SITE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  
  // Supabase
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  
  // External APIs
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'TICKETMASTER_API_KEY',
  'SETLIST_FM_API_KEY',
  
  // Database
  'DATABASE_URL',
];

// Optional but recommended environment variables
const optionalEnvVars = [
  'SENTRY_DSN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'VERCEL_URL',
  'ANALYZE',
  'CI',
];

// Check environment variables
async function checkEnvironmentVariables() {
  log.section('Environment Variables');
  
  let allRequiredPresent = true;
  
  // Check required variables
  for (const varName of requiredEnvVars) {
    const value = process.env[varName];
    if (!value) {
      addResult(
        `env:${varName}`,
        'fail',
        `Missing required environment variable: ${varName}`
      );
      allRequiredPresent = false;
    } else {
      addResult(
        `env:${varName}`,
        'pass',
        `${varName} is configured`
      );
    }
  }
  
  // Check optional variables
  for (const varName of optionalEnvVars) {
    const value = process.env[varName];
    if (!value) {
      addResult(
        `env:${varName}`,
        'warning',
        `Optional environment variable not set: ${varName}`,
        'Consider setting this for production'
      );
    } else {
      addResult(
        `env:${varName}`,
        'pass',
        `${varName} is configured (optional)`
      );
    }
  }
  
  return allRequiredPresent;
}

// Check database connection
async function checkDatabaseConnection() {
  log.section('Database Connection');
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      addResult(
        'database:connection',
        'fail',
        'Cannot test database - missing Supabase credentials'
      );
      return false;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic query
    const { data, error } = await supabase
      .from('artists')
      .select('count')
      .limit(1);
    
    if (error) {
      addResult(
        'database:connection',
        'fail',
        'Database connection failed',
        error.message
      );
      return false;
    }
    
    addResult(
      'database:connection',
      'pass',
      'Database connection successful'
    );
    
    // Check critical tables exist
    const criticalTables = ['artists', 'shows', 'venues', 'songs', 'users', 'setlists'];
    
    for (const table of criticalTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          addResult(
            `database:table:${table}`,
            'fail',
            `Table '${table}' check failed`,
            error.message
          );
        } else {
          addResult(
            `database:table:${table}`,
            'pass',
            `Table '${table}' exists (${count || 0} records)`
          );
        }
      } catch (err) {
        addResult(
          `database:table:${table}`,
          'fail',
          `Table '${table}' check failed`,
          err instanceof Error ? err.message : 'Unknown error'
        );
      }
    }
    
    return true;
  } catch (err) {
    addResult(
      'database:connection',
      'fail',
      'Database connection check failed',
      err instanceof Error ? err.message : 'Unknown error'
    );
    return false;
  }
}

// Check build process
async function checkBuildProcess() {
  log.section('Build Process');
  
  try {
    // Check if TypeScript compiles
    log.info('Running TypeScript type check...');
    try {
      const { stdout: tscOutput, stderr: tscError } = await execAsync('pnpm typecheck');
      if (tscError) {
        addResult(
          'build:typecheck',
          'warning',
          'TypeScript check completed with warnings',
          tscError
        );
      } else {
        addResult(
          'build:typecheck',
          'pass',
          'TypeScript type check passed'
        );
      }
    } catch (err) {
      addResult(
        'build:typecheck',
        'fail',
        'TypeScript type check failed',
        err instanceof Error ? err.message : 'Unknown error'
      );
      return false;
    }
    
    // Check if lint passes
    log.info('Running linter...');
    try {
      const { stdout: lintOutput, stderr: lintError } = await execAsync('pnpm lint');
      if (lintError) {
        addResult(
          'build:lint',
          'warning',
          'Linting completed with warnings',
          lintError
        );
      } else {
        addResult(
          'build:lint',
          'pass',
          'Linting passed'
        );
      }
    } catch (err) {
      addResult(
        'build:lint',
        'warning',
        'Linting check failed',
        'Consider fixing lint errors before deployment'
      );
    }
    
    // Check if build completes
    log.info('Running production build...');
    try {
      const { stdout: buildOutput, stderr: buildError } = await execAsync('pnpm build', {
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer for build output
      });
      
      if (buildError && !buildError.includes('warn')) {
        addResult(
          'build:production',
          'warning',
          'Build completed with warnings',
          buildError
        );
      } else {
        addResult(
          'build:production',
          'pass',
          'Production build successful'
        );
      }
      
      // Check if .next directory was created
      if (existsSync(path.join(process.cwd(), 'apps/web/.next'))) {
        addResult(
          'build:output',
          'pass',
          'Build output directory created'
        );
      } else {
        addResult(
          'build:output',
          'fail',
          'Build output directory not found'
        );
        return false;
      }
    } catch (err) {
      addResult(
        'build:production',
        'fail',
        'Production build failed',
        err instanceof Error ? err.message : 'Unknown error'
      );
      return false;
    }
    
    return true;
  } catch (err) {
    addResult(
      'build:process',
      'fail',
      'Build process check failed',
      err instanceof Error ? err.message : 'Unknown error'
    );
    return false;
  }
}

// Check critical files exist
async function checkCriticalFiles() {
  log.section('Critical Files');
  
  const criticalFiles = [
    { path: 'package.json', description: 'Root package.json' },
    { path: 'apps/web/package.json', description: 'Web app package.json' },
    { path: 'apps/web/next.config.js', description: 'Next.js configuration' },
    { path: 'vercel.json', description: 'Vercel configuration' },
    { path: 'turbo.json', description: 'Turborepo configuration' },
    { path: '.env.production', description: 'Production environment file', optional: true },
    { path: 'README.md', description: 'README documentation' },
  ];
  
  let allCriticalPresent = true;
  
  for (const file of criticalFiles) {
    const filePath = path.join(process.cwd(), file.path);
    try {
      await access(filePath);
      addResult(
        `file:${file.path}`,
        'pass',
        `${file.description} exists`
      );
    } catch (err) {
      if (file.optional) {
        addResult(
          `file:${file.path}`,
          'warning',
          `${file.description} not found (optional)`
        );
      } else {
        addResult(
          `file:${file.path}`,
          'fail',
          `${file.description} not found`
        );
        allCriticalPresent = false;
      }
    }
  }
  
  return allCriticalPresent;
}

// Check API endpoints configuration
async function checkAPIEndpoints() {
  log.section('API Endpoints Configuration');
  
  const apiDir = path.join(process.cwd(), 'apps/web/app/api');
  
  try {
    await access(apiDir);
    addResult(
      'api:directory',
      'pass',
      'API directory exists at apps/web/app/api'
    );
    
    // Check for critical API routes
    const criticalRoutes = [
      'health',
      'search',
      'trending',
      'auth',
      'sync',
    ];
    
    for (const route of criticalRoutes) {
      const routePath = path.join(apiDir, route);
      try {
        await access(routePath);
        addResult(
          `api:route:${route}`,
          'pass',
          `API route '${route}' exists`
        );
      } catch (err) {
        addResult(
          `api:route:${route}`,
          'warning',
          `API route '${route}' not found`,
          'Verify if this route is needed'
        );
      }
    }
    
    // Check for apps/api folder (should not exist)
    const oldApiPath = path.join(process.cwd(), 'apps/api');
    try {
      await access(oldApiPath);
      addResult(
        'api:consolidation',
        'fail',
        'Old apps/api folder still exists',
        'API consolidation may not be complete'
      );
      return false;
    } catch (err) {
      addResult(
        'api:consolidation',
        'pass',
        'API consolidation complete (apps/api removed)'
      );
    }
    
    return true;
  } catch (err) {
    addResult(
      'api:directory',
      'fail',
      'API directory not found',
      'Expected at apps/web/app/api'
    );
    return false;
  }
}

// Generate summary report
function generateSummary() {
  log.section('Pre-Deployment Checklist Summary');
  
  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const totalCount = results.length;
  
  console.log(`\n${colors.cyan}Total Checks:${colors.reset} ${totalCount}`);
  console.log(`${colors.green}Passed:${colors.reset} ${passCount}`);
  console.log(`${colors.red}Failed:${colors.reset} ${failCount}`);
  console.log(`${colors.yellow}Warnings:${colors.reset} ${warningCount}`);
  console.log(`${colors.magenta}Success Rate:${colors.reset} ${Math.round((passCount / totalCount) * 100)}%`);
  
  if (failCount > 0) {
    console.log(`\n${colors.red}❌ DEPLOYMENT BLOCKED${colors.reset}`);
    console.log('The following critical issues must be resolved:');
    results
      .filter(r => r.status === 'fail')
      .forEach(r => {
        console.log(`  • ${r.message}`);
        if (r.details) {
          console.log(`    ${colors.yellow}→${colors.reset} ${r.details}`);
        }
      });
  } else if (warningCount > 0) {
    console.log(`\n${colors.yellow}⚠️  DEPLOYMENT POSSIBLE WITH WARNINGS${colors.reset}`);
    console.log('Consider addressing these warnings:');
    results
      .filter(r => r.status === 'warning')
      .forEach(r => {
        console.log(`  • ${r.message}`);
      });
  } else {
    console.log(`\n${colors.green}✅ ALL CHECKS PASSED!${colors.reset}`);
    console.log('Application is ready for deployment.');
  }
  
  return failCount === 0;
}

// Main execution
async function main() {
  console.log(`${colors.magenta}🚀 MySetlist Pre-Deployment Checklist${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(40)}${colors.reset}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  try {
    // Run all checks
    const envCheck = await checkEnvironmentVariables();
    const filesCheck = await checkCriticalFiles();
    const apiCheck = await checkAPIEndpoints();
    const dbCheck = await checkDatabaseConnection();
    const buildCheck = await checkBuildProcess();
    
    // Generate summary
    const canDeploy = generateSummary();
    
    // Exit with appropriate code
    process.exit(canDeploy ? 0 : 1);
  } catch (err) {
    console.error(`\n${colors.red}Fatal error during pre-deployment checks:${colors.reset}`);
    console.error(err);
    process.exit(2);
  }
}

// Run the script
main().catch(console.error);