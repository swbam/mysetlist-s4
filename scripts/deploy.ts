#!/usr/bin/env tsx
/**
 * Simple deployment script for MySetlist
 * 
 * Usage: pnpm deploy
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

async function deploy() {
  console.log(chalk.blue('🚀 Starting MySetlist deployment...\n'));

  try {
    // 1. Check environment
    console.log(chalk.yellow('📋 Checking environment variables...'));
    execSync('pnpm check:env', { stdio: 'inherit' });
    
    // 2. Run build
    console.log(chalk.yellow('\n🔨 Building application...'));
    execSync('pnpm build', { stdio: 'inherit' });
    
    // 3. Deploy to Vercel
    console.log(chalk.yellow('\n🚢 Deploying to Vercel...'));
    execSync('vercel --prod', { stdio: 'inherit' });
    
    console.log(chalk.green('\n✅ Deployment successful!'));
    console.log(chalk.blue('🌐 Your app is now live at: https://mysetlist-sonnet.vercel.app'));
  } catch (error) {
    console.error(chalk.red('❌ Deployment failed:'), error);
    process.exit(1);
  }
}

// Run deployment
deploy();