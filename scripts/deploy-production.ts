#!/usr/bin/env tsx
/**
 * 🚀 Production Deployment Script for MySetlist
 * 
 * This script handles the complete deployment process with proper checks
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
const envPaths = ['.env.local', '.env.production', '.env'];
for (const path of envPaths) {
  if (existsSync(path)) {
    dotenv.config({ path, override: false });
  }
}

interface DeploymentStep {
  name: string;
  command: string;
  critical: boolean;
  skipIf?: () => boolean;
}

const DEPLOYMENT_STEPS: DeploymentStep[] = [
  {
    name: 'Validate Environment Variables',
    command: 'pnpm validate:deploy',
    critical: true,
  },
  {
    name: 'Verify Database Connection',
    command: 'tsx scripts/verify-database-connection.ts',
    critical: true,
  },
  {
    name: 'Install Dependencies',
    command: 'pnpm install',
    critical: true,
  },
  {
    name: 'Generate Database Types',
    command: 'pnpm db:generate',
    critical: false,
  },
  {
    name: 'Push Database Schema',
    command: 'pnpm db:push',
    critical: true,
  },
  {
    name: 'Run TypeScript Check',
    command: 'pnpm typecheck',
    critical: false,
  },
  {
    name: 'Build Application',
    command: 'pnpm build',
    critical: true,
  },
  {
    name: 'Deploy Supabase Functions',
    command: 'pnpm deploy:functions',
    critical: false,
    skipIf: () => !process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  {
    name: 'Deploy to Vercel',
    command: 'vercel --prod --yes',
    critical: true,
  },
];

class DeploymentManager {
  private startTime: number;
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor() {
    this.startTime = Date.now();
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const icons = {
      info: 'ℹ️ ',
      success: '✅',
      error: '❌',
      warning: '⚠️ ',
    };
    
    console.log(`${icons[type]} ${message}`);
  }

  private async executeStep(step: DeploymentStep): Promise<boolean> {
    if (step.skipIf && step.skipIf()) {
      this.log(`Skipping: ${step.name}`, 'warning');
      return true;
    }

    this.log(`Running: ${step.name}...`);
    
    try {
      execSync(step.command, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      
      this.log(`${step.name} completed`, 'success');
      return true;
    } catch (error) {
      const message = `${step.name} failed: ${error.message}`;
      
      if (step.critical) {
        this.errors.push(message);
        this.log(message, 'error');
        return false;
      } else {
        this.warnings.push(message);
        this.log(message, 'warning');
        return true;
      }
    }
  }

  async deploy(options: { skipTests?: boolean; force?: boolean } = {}) {
    console.log('🚀 MySetlist Production Deployment\n');
    console.log('📋 Pre-deployment checks...\n');

    // Check if we're in the right directory
    if (!existsSync('apps/web')) {
      this.log('Not in project root directory', 'error');
      process.exit(1);
    }

    // Check Git status
    try {
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
      if (gitStatus.trim() && !options.force) {
        this.log('Uncommitted changes detected', 'warning');
        console.log('Use --force to deploy anyway\n');
      }
    } catch (error) {
      this.log('Git check failed', 'warning');
    }

    // Execute deployment steps
    for (const step of DEPLOYMENT_STEPS) {
      if (options.skipTests && step.name.includes('Test')) {
        continue;
      }

      const success = await this.executeStep(step);
      
      if (!success && step.critical) {
        this.printSummary();
        process.exit(1);
      }
    }

    // Post-deployment verification
    console.log('\n📋 Post-deployment verification...\n');
    
    try {
      // Get deployment URL
      const deploymentUrl = execSync('vercel ls --json | jq -r ".[0].url"', {
        encoding: 'utf8',
      }).trim();
      
      if (deploymentUrl) {
        console.log(`🌐 Deployment URL: https://${deploymentUrl}`);
        
        // Test the deployment
        const healthCheckUrl = `https://${deploymentUrl}/api/health`;
        console.log(`\n🏥 Testing health endpoint: ${healthCheckUrl}`);
        
        try {
          const response = await fetch(healthCheckUrl);
          if (response.ok) {
            this.log('Health check passed', 'success');
          } else {
            this.log(`Health check returned ${response.status}`, 'warning');
          }
        } catch (error) {
          this.log('Health check failed', 'warning');
        }
      }
    } catch (error) {
      this.log('Could not verify deployment', 'warning');
    }

    this.printSummary();
  }

  private printSummary() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Deployment Summary\n');
    console.log(`⏱️  Duration: ${duration}s`);
    
    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    if (this.errors.length === 0) {
      console.log('\n✅ Deployment completed successfully!');
      console.log('\n🎉 MySetlist is now live in production!');
    } else {
      console.log('\n❌ Deployment failed with errors');
      console.log('\n📝 Please fix the errors and try again');
    }
    
    console.log('='.repeat(50));
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    skipTests: args.includes('--skip-tests'),
    force: args.includes('--force'),
  };
  
  const deployer = new DeploymentManager();
  await deployer.deploy(options);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});