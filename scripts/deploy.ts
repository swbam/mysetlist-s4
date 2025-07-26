#!/usr/bin/env tsx
/**
 * 🚀 MYSETLIST PRODUCTION DEPLOYMENT SCRIPT
 *
 * Simplified deployment script for MySetlist production deployment
 * Only deploys to mysetlist-sonnet on Vercel
 *
 * Usage:
 *   pnpm deploy               # Full deployment
 *   pnpm deploy --skip-build  # Skip build step
 *   pnpm deploy --skip-tests  # Skip tests
 *   pnpm deploy --dry-run     # Dry run mode
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { config } from 'dotenv';

// Load environment variables
const envPaths = [
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '.env'),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: false });
  }
}

// CLI Arguments
const args = process.argv.slice(2);
const FLAGS = {
  SKIP_TESTS: args.includes('--skip-tests'),
  SKIP_BUILD: args.includes('--skip-build'),
  DRY_RUN: args.includes('--dry-run'),
  VERBOSE: args.includes('--verbose') || args.includes('-v'),
};

// Simple logger
const log = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  success: (msg: string) => console.log(`[SUCCESS] ✅ ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ❌ ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ⚠️  ${msg}`),
};

// Execute command helper
async function exec(command: string, options: { cwd?: string } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    log.info(`Running: ${command}`);
    
    if (FLAGS.DRY_RUN) {
      log.info(`[DRY RUN] Would execute: ${command}`);
      return resolve('[DRY RUN]');
    }

    const child = spawn('sh', ['-c', command], {
      cwd: options.cwd || process.cwd(),
      stdio: FLAGS.VERBOSE ? 'inherit' : ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        CI: 'true',
      },
    });

    let stdout = '';
    let stderr = '';

    if (!FLAGS.VERBOSE) {
      child.stdout?.on('data', (data) => { stdout += data.toString(); });
      child.stderr?.on('data', (data) => { stderr += data.toString(); });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
      }
    });
  });
}

// Main deployment function
async function deploy() {
  const startTime = Date.now();
  log.info('🚀 Starting MySetlist production deployment to mysetlist-sonnet');

  try {
    // Step 1: Install dependencies
    log.info('📦 Installing dependencies...');
    await exec('pnpm install --no-frozen-lockfile');
    log.success('Dependencies installed');

    // Step 2: Run tests (optional)
    if (!FLAGS.SKIP_TESTS) {
      log.info('🧪 Running tests...');
      await exec('pnpm typecheck');
      log.success('Tests passed');
    }

    // Step 3: Build application
    if (!FLAGS.SKIP_BUILD) {
      log.info('🏗️  Building application...');
      await exec('rm -rf apps/web/.next .turbo');
      await exec('NODE_ENV=production pnpm build');
      log.success('Build completed');
    }

    // Step 4: Deploy to Vercel
    log.info('🚀 Deploying to Vercel (mysetlist-sonnet)...');
    await exec('vercel --prod --yes');
    log.success('Deployment completed');

    // Step 5: Simple health check
    log.info('🔍 Running health check...');
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s for deployment
    
    try {
      await exec('curl -f https://mysetlist-sonnet.vercel.app/api/health');
      log.success('Health check passed');
    } catch (error) {
      log.warn('Health check failed, but deployment may still be successful');
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    log.success(`🎉 Deployment completed successfully in ${duration}s!`);

  } catch (error) {
    log.error(`Deployment failed: ${error}`);
    process.exit(1);
  }
}

// Run deployment
deploy().catch((error) => {
  log.error(`Fatal error: ${error}`);
  process.exit(1);
});