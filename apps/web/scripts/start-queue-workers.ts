#!/usr/bin/env tsx
// MySetlist-S4 Queue Workers Startup Script
// File: apps/web/scripts/start-queue-workers.ts
// Starts all queue workers with proper configuration

import chalk from 'chalk';
import { QueueManager } from '../lib/queues/queue-manager';
import { cacheManager } from '../lib/cache/cache-manager';
import { dataFreshnessManager } from '../lib/services/data-freshness-manager';
import { trafficAwareScheduler } from '../lib/services/traffic-aware-scheduler';

async function startWorkers() {
  console.log(chalk.blue('🚀 Starting MySetlist-S4 Queue Workers\n'));

  try {
    // Initialize queue manager
    console.log(chalk.yellow('Initializing queue system...'));
    const queueManager = QueueManager.getInstance();
    
    // Start all workers
    console.log(chalk.yellow('Starting queue workers...'));
    await queueManager.startAll();
    
    // Get initial statistics
    const stats = await queueManager.getQueueStatistics();
    console.log(chalk.green('✅ Queue workers started successfully\n'));
    
    // Display queue status
    console.log(chalk.white('Queue Status:'));
    console.log(chalk.white('─'.repeat(50)));
    
    for (const [name, stat] of Object.entries(stats)) {
      console.log(chalk.white(
        `${name.padEnd(20)} | Active: ${stat.active} | Waiting: ${stat.waiting} | Delayed: ${stat.delayed}`
      ));
    }
    
    console.log(chalk.white('─'.repeat(50)));

    // Start cache warming
    console.log(chalk.yellow('\nStarting cache warming service...'));
    cacheManager.startWarming();
    console.log(chalk.green('✅ Cache warming started'));

    // Analyze traffic patterns for optimal scheduling
    console.log(chalk.yellow('\nAnalyzing traffic patterns...'));
    await trafficAwareScheduler.analyzeTrafficPatterns(7); // Last 7 days
    console.log(chalk.green('✅ Traffic patterns analyzed'));

    // Schedule initial data freshness check
    console.log(chalk.yellow('\nScheduling data freshness check...'));
    setTimeout(async () => {
      const report = await dataFreshnessManager.checkAndScheduleSyncs();
      console.log(chalk.blue(
        `\n📊 Freshness Check: ${report.staleEntities}/${report.totalEntities} entities need refresh`
      ));
    }, 30000); // Run after 30 seconds

    // Display monitoring info
    console.log(chalk.blue('\n📊 Monitoring Dashboard:'));
    console.log(chalk.white('─'.repeat(50)));
    console.log(chalk.white('Queue Statistics: http://localhost:3001/admin/queues'));
    console.log(chalk.white('Import Progress: http://localhost:3001/api/import/active'));
    console.log(chalk.white('System Health: http://localhost:3001/api/health'));
    console.log(chalk.white('─'.repeat(50)));

    // Set up periodic status updates
    setInterval(async () => {
      const stats = await queueManager.getQueueStatistics();
      const activeJobs = Object.values(stats).reduce((sum, s) => sum + s.active, 0);
      const waitingJobs = Object.values(stats).reduce((sum, s) => sum + s.waiting, 0);
      
      process.stdout.write(
        `\r${chalk.gray(new Date().toISOString())} | ` +
        `Active: ${chalk.yellow(activeJobs.toString())} | ` +
        `Waiting: ${chalk.blue(waitingJobs.toString())} | ` +
        `Press Ctrl+C to stop`
      );
    }, 5000);

    console.log(chalk.green('\n\n✨ All systems operational! Press Ctrl+C to stop.\n'));

  } catch (error) {
    console.error(chalk.red('Failed to start workers:'), error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log(chalk.yellow('\n\n🛑 Shutting down workers...'));
  
  try {
    const queueManager = QueueManager.getInstance();
    
    // Stop accepting new jobs
    console.log(chalk.yellow('Pausing queues...'));
    await queueManager.pauseAll();
    
    // Wait for active jobs to complete (max 30 seconds)
    console.log(chalk.yellow('Waiting for active jobs to complete...'));
    const timeout = setTimeout(() => {
      console.log(chalk.red('Timeout waiting for jobs. Force closing...'));
      process.exit(1);
    }, 30000);
    
    // Close all connections
    await queueManager.closeAll();
    clearTimeout(timeout);
    
    // Stop cache warming
    cacheManager.stopWarming();
    
    console.log(chalk.green('✅ Shutdown complete'));
    process.exit(0);
    
  } catch (error) {
    console.error(chalk.red('Error during shutdown:'), error);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught exception:'), error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled rejection at:'), promise, chalk.red('reason:'), reason);
  shutdown();
});

// Start the workers
startWorkers();
