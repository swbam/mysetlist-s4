#!/usr/bin/env tsx
/**
 * 🚀 Simple MySetlist Deployment Script
 * 
 * A straightforward deployment script that just builds and deploys to Vercel
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const skipDeploy = args.includes('--skip-deploy');

async function run() {
  console.log('🚀 MySetlist Deployment\n');

  try {
    // Step 1: Clean
    console.log('🧹 Cleaning build artifacts...');
    await execAsync('rm -rf apps/web/.next');
    
    // Step 2: Install dependencies
    if (!skipBuild) {
      console.log('📦 Installing dependencies...');
      await execAsync('pnpm install');
    }
    
    // Step 3: Build
    if (!skipBuild) {
      console.log('🏗️  Building application...');
      const { stdout, stderr } = await execAsync('pnpm build');
      if (stderr && !stderr.includes('warning')) {
        console.error('Build warnings:', stderr);
      }
      console.log('✅ Build successful');
    }
    
    // Step 4: Deploy to Vercel
    if (!skipDeploy) {
      console.log('🚀 Deploying to Vercel...');
      const { stdout } = await execAsync('vercel --yes');
      console.log('✅ Deployment successful');
      console.log('🌐 URL:', stdout.trim());
    }
    
    console.log('\n✨ Done!');
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

run();