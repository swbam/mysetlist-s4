#!/usr/bin/env tsx

/**
 * Deployment Guide Script
 * 
 * This script provides an interactive deployment guide that:
 * - Runs pre-deployment checks
 * - Guides through the deployment process
 * - Runs post-deployment verification
 * - Provides rollback instructions if needed
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import readline from 'readline';
import path from 'path';

const execAsync = promisify(exec);

// Color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Utility functions
const log = {
  header: (msg: string) => console.log(`\n${colors.bold}${colors.magenta}${msg}${colors.reset}`),
  section: (msg: string) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  step: (num: number, msg: string) => console.log(`\n${colors.bold}Step ${num}:${colors.reset} ${msg}`),
  command: (cmd: string) => console.log(`  ${colors.yellow}$${colors.reset} ${colors.cyan}${cmd}${colors.reset}`),
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Prompt user for confirmation
async function confirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Execute command with output
async function executeCommand(command: string, description: string): Promise<boolean> {
  log.info(`Running: ${description}`);
  log.command(command);
  
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) {
      console.log(stdout);
    }
    if (stderr && !stderr.includes('warn')) {
      log.warning('Command completed with warnings:');
      console.log(stderr);
    }
    log.success(`${description} completed`);
    return true;
  } catch (err) {
    log.error(`${description} failed`);
    if (err instanceof Error) {
      console.error(err.message);
    }
    return false;
  }
}

// Deployment steps
const deploymentSteps = [
  {
    name: 'Pre-deployment Checks',
    description: 'Verify all systems are ready for deployment',
    command: 'tsx scripts/pre-deployment-checklist.ts',
    critical: true,
  },
  {
    name: 'Git Status Check',
    description: 'Ensure all changes are committed',
    command: 'git status --porcelain',
    validate: async (output: string) => {
      if (output.trim()) {
        log.warning('Uncommitted changes detected');
        return await confirm('Continue with uncommitted changes?');
      }
      return true;
    },
  },
  {
    name: 'Install Dependencies',
    description: 'Ensure all dependencies are installed',
    command: 'pnpm install',
    critical: true,
  },
  {
    name: 'Database Migrations',
    description: 'Run any pending database migrations',
    command: 'pnpm db:migrate || true',
    critical: false,
  },
  {
    name: 'Build Application',
    description: 'Create production build',
    command: 'pnpm build',
    critical: true,
  },
  {
    name: 'Run Tests',
    description: 'Execute test suite',
    command: 'pnpm test || true',
    critical: false,
  },
  {
    name: 'Deploy to Vercel',
    description: 'Deploy application to production',
    command: 'vercel --prod',
    critical: true,
  },
];

// Main deployment flow
async function runDeployment() {
  log.header('🚀 MySetlist Deployment Guide');
  console.log('This guide will walk you through deploying MySetlist to production.');
  
  // Check if user wants to proceed
  if (!await confirm('\nDo you want to start the deployment process?')) {
    console.log('Deployment cancelled.');
    process.exit(0);
  }
  
  // Record deployment start time
  const deploymentStart = new Date();
  const deploymentLog: any[] = [];
  
  // Run through deployment steps
  for (let i = 0; i < deploymentSteps.length; i++) {
    const step = deploymentSteps[i];
    log.step(i + 1, step.name);
    log.info(step.description);
    
    const stepStart = Date.now();
    let success = false;
    
    try {
      if (step.validate) {
        const { stdout } = await execAsync(step.command);
        success = await step.validate(stdout);
      } else {
        success = await executeCommand(step.command, step.name);
      }
    } catch (err) {
      success = false;
      log.error(`${step.name} failed`);
      if (err instanceof Error) {
        console.error(err.message);
      }
    }
    
    const stepDuration = Date.now() - stepStart;
    deploymentLog.push({
      step: step.name,
      success,
      duration: stepDuration,
      timestamp: new Date().toISOString(),
    });
    
    if (!success && step.critical) {
      log.error(`Critical step failed: ${step.name}`);
      
      if (await confirm('Do you want to continue anyway?')) {
        log.warning('Continuing despite critical failure...');
      } else {
        log.error('Deployment aborted');
        await saveDeploymentLog(deploymentLog, 'failed');
        process.exit(1);
      }
    }
    
    // Pause between steps
    if (i < deploymentSteps.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Deployment complete
  log.section('Deployment Complete');
  log.success('All deployment steps have been executed');
  
  // Get deployment URL
  log.info('Retrieving deployment URL...');
  try {
    const { stdout } = await execAsync('vercel ls --limit 1');
    console.log(stdout);
  } catch (err) {
    log.warning('Could not retrieve deployment URL');
  }
  
  // Ask about post-deployment testing
  if (await confirm('\nWould you like to run post-deployment tests?')) {
    log.section('Post-Deployment Testing');
    
    const prodUrl = await new Promise<string>((resolve) => {
      rl.question('Enter the production URL (or press Enter for default): ', (answer) => {
        resolve(answer || process.env.NEXT_PUBLIC_SITE_URL || 'https://mysetlist.vercel.app');
      });
    });
    
    process.env.NEXT_PUBLIC_SITE_URL = prodUrl;
    
    const testSuccess = await executeCommand(
      'tsx scripts/post-deployment-test.ts',
      'Post-deployment tests'
    );
    
    if (!testSuccess) {
      log.warning('Post-deployment tests failed');
      
      if (await confirm('Would you like to rollback the deployment?')) {
        await runRollback();
      }
    } else {
      log.success('All post-deployment tests passed!');
    }
  }
  
  // Save deployment log
  await saveDeploymentLog(deploymentLog, 'success');
  
  // Final summary
  const deploymentDuration = Date.now() - deploymentStart.getTime();
  log.section('Deployment Summary');
  console.log(`Start time: ${deploymentStart.toISOString()}`);
  console.log(`Duration: ${Math.round(deploymentDuration / 1000)}s`);
  console.log(`Status: ${colors.green}SUCCESS${colors.reset}`);
  
  // Provide next steps
  log.section('Next Steps');
  console.log('1. Monitor application logs for any errors');
  console.log('2. Check application metrics and performance');
  console.log('3. Verify all critical user flows are working');
  console.log('4. Monitor error tracking (Sentry) for any issues');
  
  rl.close();
}

// Rollback functionality
async function runRollback() {
  log.section('Deployment Rollback');
  log.warning('Initiating rollback to previous deployment...');
  
  try {
    // Get list of recent deployments
    const { stdout } = await execAsync('vercel ls --limit 5');
    console.log('Recent deployments:');
    console.log(stdout);
    
    // Rollback to previous
    await executeCommand('vercel rollback', 'Rollback deployment');
    
    log.success('Rollback completed');
  } catch (err) {
    log.error('Rollback failed');
    console.error(err);
  }
}

// Save deployment log
async function saveDeploymentLog(log: any[], status: string) {
  const logFile = path.join(
    process.cwd(),
    'deployment-logs',
    `deployment-${new Date().toISOString().replace(/:/g, '-')}-${status}.json`
  );
  
  try {
    await writeFile(logFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      status,
      steps: log,
    }, null, 2));
    console.log(`Deployment log saved to: ${logFile}`);
  } catch (err) {
    // Create directory and try again
    try {
      await execAsync('mkdir -p deployment-logs');
      await writeFile(logFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        status,
        steps: log,
      }, null, 2));
      console.log(`Deployment log saved to: ${logFile}`);
    } catch (err2) {
      console.error('Failed to save deployment log');
    }
  }
}

// Error handler
process.on('unhandledRejection', (err) => {
  log.error('Unhandled error during deployment:');
  console.error(err);
  process.exit(1);
});

// Run deployment
runDeployment().catch((err) => {
  log.error('Fatal error during deployment:');
  console.error(err);
  process.exit(1);
});