#!/usr/bin/env tsx
/**
 * Simple test runner for MySetlist
 * Runs tests in the web app since that's where all the tests are
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

async function runTests() {
  console.log(chalk.blue('🧪 Running MySetlist tests...\n'));

  try {
    // Run tests in web app
    console.log(chalk.yellow('Running tests in apps/web...'));
    execSync('cd apps/web && pnpm test', { stdio: 'inherit' });
    
    console.log(chalk.green('\n✅ All tests completed!'));
  } catch (error) {
    console.error(chalk.red('❌ Tests failed:'), error);
    process.exit(1);
  }
}

// Run tests
runTests();