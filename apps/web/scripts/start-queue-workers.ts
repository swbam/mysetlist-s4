#!/usr/bin/env tsx
// MySetlist-S4 Queue Workers Startup Script
// File: apps/web/scripts/start-queue-workers.ts
// Starts all queue workers with proper configuration

import queueManager from '../lib/queues/queue-manager';
import { cacheManager } from '../lib/cache/cache-manager';
import { dataFreshnessManager } from '../lib/services/data-freshness-manager';
import { trafficAwareScheduler } from '../lib/services/traffic-aware-scheduler';

async function startWorkers() {
  console.log('🚀 Starting MySetlist-S4 Queue Workers\n');

  try {
    // Initialize queue manager
    console.log('Initializing queue system...');
    await queueManager.initialize();
    
    // Start all workers
    console.log('Starting queue workers...');
    // Workers are created during initialize in this implementation
    
    // Get initial statistics
    const stats = await queueManager.getAllStats();
    console.log('✅ Queue workers started successfully\n');
    
    // Display queue status
    console.log('Queue Status:');
    console.log('─'.repeat(50));
    
    for (const s of stats as any[]) {
      console.log(`${String(s.name).padEnd(20)} | Active: ${s.active} | Waiting: ${s.waiting} | Delayed: ${s.delayed}`);
    }
    
    console.log('─'.repeat(50));

    // Start cache warming with error handling
    try {
      console.log('\nStarting cache warming service...');
      cacheManager.startWarming();
      console.log('✅ Cache warming started');
    } catch (error) {
      console.warn('⚠️ Cache warming failed to start:', error);
    }

    // Analyze traffic patterns with error handling  
    try {
      console.log('\nAnalyzing traffic patterns...');
      await trafficAwareScheduler.analyzeTrafficPatterns(7);
      console.log('✅ Traffic patterns analyzed');
    } catch (error) {
      console.warn('⚠️ Traffic analysis failed:', error);
    }

    // Schedule initial data freshness check with error handling
    try {
      console.log('\nScheduling data freshness check...');
      setTimeout(async () => {
        try {
          const report = await dataFreshnessManager.checkAndScheduleSyncs();
          console.log(`\n📊 Freshness Check: ${report.staleEntities}/${report.totalEntities} entities need refresh`);
        } catch (error) {
          console.warn('⚠️ Data freshness check failed:', error);
        }
      }, 30000); // Run after 30 seconds
    } catch (error) {
      console.warn('⚠️ Failed to schedule data freshness check:', error);
    }

    // Display monitoring info
    console.log('\n📊 Monitoring Dashboard:');
    console.log('─'.repeat(50));
    console.log('Queue Statistics: http://localhost:3001/admin/queues');
    console.log('Import Progress: http://localhost:3001/api/import/active');
    console.log('System Health: http://localhost:3001/api/health');
    console.log('─'.repeat(50));

    // Set up periodic status updates
    setInterval(async () => {
      const stats = (await queueManager.getAllStats()) as any[];
      const activeJobs = stats.reduce((sum, s) => sum + (s.active || 0), 0);
      const waitingJobs = stats.reduce((sum, s) => sum + (s.waiting || 0), 0);
      
      process.stdout.write(
        `\r${new Date().toISOString()} | ` +
        `Active: ${activeJobs.toString()} | ` +
        `Waiting: ${waitingJobs.toString()} | ` +
        `Press Ctrl+C to stop`
      );
    }, 5000);

    console.log('\n\n✨ All systems operational! Press Ctrl+C to stop.\n');

  } catch (error) {
    console.error('Failed to start workers:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('\n\n🛑 Shutting down workers...');
  
  try {
    
    
    // Close all connections via queue manager shutdown
    await queueManager.shutdown();
    
    // Stop cache warming
    try {
      cacheManager.stopWarming();
    } catch (error) {
      console.warn('⚠️ Failed to stop cache warming:', error);
    }
    
    console.log('✅ Shutdown complete');
    process.exit(0);
    
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  shutdown();
});

// Start the workers
startWorkers();
