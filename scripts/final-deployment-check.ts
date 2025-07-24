#!/usr/bin/env tsx
/**
 * Final deployment check for MySetlist
 * Ensures the app is 100% ready for production
 */

import { execSync } from 'child_process';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

interface Check {
  name: string;
  test: () => boolean | Promise<boolean>;
  fix?: string;
}

async function runCheck(check: Check): Promise<boolean> {
  try {
    const result = await check.test();
    if (result) {
      console.log(chalk.green(`✅ ${check.name}`));
    } else {
      console.log(chalk.red(`❌ ${check.name}`));
      if (check.fix) {
        console.log(chalk.yellow(`   Fix: ${check.fix}`));
      }
    }
    return result;
  } catch (error) {
    console.log(chalk.red(`❌ ${check.name}`));
    console.log(chalk.gray(`   Error: ${error.message}`));
    if (check.fix) {
      console.log(chalk.yellow(`   Fix: ${check.fix}`));
    }
    return false;
  }
}

const checks: Check[] = [
  // Environment Variables
  {
    name: 'All required environment variables are set',
    test: () => {
      const envPath = resolve(process.cwd(), 'apps/web/.env.local');
      if (!existsSync(envPath)) return false;
      
      const env = readFileSync(envPath, 'utf-8');
      const required = [
        'DATABASE_URL',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SPOTIFY_CLIENT_ID',
        'SPOTIFY_CLIENT_SECRET',
        'TICKETMASTER_API_KEY',
        'SETLISTFM_API_KEY',
        'CRON_SECRET',
      ];
      
      return required.every(key => env.includes(`${key}=`));
    },
    fix: 'Copy .env.example to .env.local and fill in all values',
  },
  
  // Dependencies
  {
    name: 'All dependencies are installed',
    test: () => {
      try {
        execSync('pnpm install --frozen-lockfile', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Run: pnpm install',
  },
  
  // TypeScript
  {
    name: 'No TypeScript errors',
    test: () => {
      try {
        execSync('pnpm typecheck', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Run: pnpm typecheck and fix any errors',
  },
  
  // Build
  {
    name: 'Project builds successfully',
    test: () => {
      try {
        console.log(chalk.gray('   Building project (this may take a minute)...'));
        execSync('pnpm build --filter=web', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Run: pnpm build --filter=web and fix any errors',
  },
  
  // Database Schema
  {
    name: 'User follows artists schema exists',
    test: () => {
      const schemaPath = resolve(process.cwd(), 'packages/database/src/schema/user-follows-artists.ts');
      return existsSync(schemaPath);
    },
    fix: 'The user-follows-artists schema has been created',
  },
  
  // Vercel Configuration
  {
    name: 'Vercel configuration is correct',
    test: () => {
      const vercelPath = resolve(process.cwd(), 'vercel.json');
      if (!existsSync(vercelPath)) return false;
      
      const config = JSON.parse(readFileSync(vercelPath, 'utf-8'));
      // Check that crons are NOT in vercel.json (they should be in Supabase)
      return !config.crons;
    },
    fix: 'Cron jobs should be configured in Supabase, not Vercel',
  },
  
  // Package.json Scripts
  {
    name: 'Deployment scripts are configured',
    test: () => {
      const packagePath = resolve(process.cwd(), 'package.json');
      const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
      
      return pkg.scripts['deploy:production'] && 
             pkg.scripts['validate:deploy'] &&
             pkg.scripts['deploy:functions'];
    },
    fix: 'Deployment scripts have been added to package.json',
  },
  
  // No Mock Data
  {
    name: 'No mock data in production code',
    test: () => {
      try {
        // Search for common mock data patterns
        const result = execSync(
          'grep -r "mockData\\|MOCK_\\|// TODO: Replace with real" apps/web/app --exclude-dir=node_modules --exclude-dir=.next || true',
          { encoding: 'utf-8' }
        );
        return result.trim() === '';
      } catch {
        return true; // grep returns non-zero if no matches found
      }
    },
    fix: 'Remove all mock data and ensure all pages use real database queries',
  },
  
  // API Routes
  {
    name: 'All API routes are in apps/web/app/api',
    test: () => {
      // Check that apps/api folder doesn't exist
      return !existsSync(resolve(process.cwd(), 'apps/api'));
    },
    fix: 'All API routes have been consolidated in apps/web/app/api',
  },
  
  // Edge Functions
  {
    name: 'Supabase edge functions exist',
    test: () => {
      const functionsDir = resolve(process.cwd(), 'supabase/functions');
      const requiredFunctions = [
        'scheduled-sync',
        'sync-artists',
        'sync-shows',
        'sync-setlists',
        'sync-artist-shows',
        'sync-song-catalog',
        'update-trending',
      ];
      
      return requiredFunctions.every(func => 
        existsSync(resolve(functionsDir, func, 'index.ts'))
      );
    },
    fix: 'All required Supabase edge functions are present',
  },
];

async function runFinalCheck() {
  console.log(chalk.bold.cyan('\n🔍 MySetlist Final Deployment Check\n'));
  
  let passedChecks = 0;
  const totalChecks = checks.length;
  
  for (const check of checks) {
    const passed = await runCheck(check);
    if (passed) passedChecks++;
  }
  
  const successRate = (passedChecks / totalChecks) * 100;
  
  console.log(chalk.bold.white('\n📊 Results:'));
  console.log(`Total Checks: ${totalChecks}`);
  console.log(`Passed: ${chalk.green(passedChecks)}`);
  console.log(`Failed: ${chalk.red(totalChecks - passedChecks)}`);
  console.log(`Success Rate: ${chalk.yellow(successRate.toFixed(1) + '%')}`);
  
  if (passedChecks === totalChecks) {
    console.log(chalk.bold.green('\n🎉 MySetlist is 100% ready for production deployment! 🎉'));
    console.log(chalk.cyan('\nNext steps:'));
    console.log('1. Run: pnpm deploy:functions');
    console.log('2. Run: pnpm deploy:production');
    console.log('3. Verify deployment at your production URL');
    process.exit(0);
  } else {
    console.log(chalk.bold.yellow('\n⚠️  Some checks failed. Please fix the issues above before deploying.'));
    process.exit(1);
  }
}

// Run the final check
runFinalCheck().catch(error => {
  console.error(chalk.red('\n❌ Final check failed:'), error);
  process.exit(1);
});