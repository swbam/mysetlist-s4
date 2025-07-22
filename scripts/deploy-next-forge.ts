#!/usr/bin/env tsx
/**
 * 🚀 Next-Forge Monorepo Deployment Script
 * 
 * Properly handles Next-Forge monorepo structure for Vercel deployment
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const skipDeploy = args.includes('--skip-deploy');
const isProduction = args.includes('--prod') || args.includes('--production');

async function run() {
  console.log('🚀 Next-Forge MySetlist Deployment\n');

  try {
    // Step 1: Verify we're in the correct directory
    const packageJson = await fs.readFile('package.json', 'utf8');
    const pkg = JSON.parse(packageJson);
    
    if (pkg.name !== 'next-forge') {
      throw new Error('This script must be run from the monorepo root directory');
    }

    // Step 2: Clean
    console.log('🧹 Cleaning build artifacts...');
    await execAsync('rm -rf apps/web/.next apps/web/.turbo');
    
    // Step 3: Install dependencies
    if (!skipBuild) {
      console.log('📦 Installing dependencies...');
      await execAsync('pnpm install --frozen-lockfile');
    }
    
    // Step 4: Build using Turborepo
    if (!skipBuild) {
      console.log('🏗️  Building application with Turborepo...');
      const buildCmd = 'pnpm turbo build --filter=web';
      const { stdout, stderr } = await execAsync(buildCmd, {
        env: { ...process.env, FORCE_COLOR: '1' }
      });
      
      if (stderr && !stderr.includes('warning')) {
        console.error('Build warnings:', stderr);
      }
      console.log('✅ Build successful');
    }
    
    // Step 5: Deploy to Vercel
    if (!skipDeploy) {
      console.log('🚀 Deploying to Vercel...');
      
      // Change to the web app directory for deployment
      process.chdir(path.join(process.cwd(), 'apps/web'));
      
      const deployCmd = isProduction 
        ? 'vercel --prod --yes' 
        : 'vercel --yes';
      
      const { stdout } = await execAsync(deployCmd);
      console.log('✅ Deployment successful');
      
      // Extract URL from output
      const urlMatch = stdout.match(/https:\/\/[^\s]+/);
      if (urlMatch) {
        console.log('🌐 URL:', urlMatch[0]);
      }
      
      // Return to root directory
      process.chdir(path.join(process.cwd(), '../..'));
    }
    
    console.log('\n✨ Done!');
    
    // Additional instructions
    console.log('\n📝 Post-deployment checklist:');
    console.log('1. Check deployment status in Vercel dashboard');
    console.log('2. Verify all environment variables are set');
    console.log('3. Test the deployed application');
    console.log('4. Monitor error logs and performance');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run the deployment
run().catch(console.error);