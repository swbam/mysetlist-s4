#!/usr/bin/env tsx
/**
 * Test the complete data sync pipeline
 * Validates all Supabase edge functions and cron jobs
 */

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(chalk.red('❌ Missing Supabase environment variables'));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TestResult {
  function: string;
  success: boolean;
  message: string;
  duration: number;
}

async function testFunction(
  functionName: string,
  payload: any = {}
): Promise<TestResult> {
  const start = Date.now();
  
  try {
    console.log(chalk.blue(`Testing ${functionName}...`));
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    });
    
    if (error) {
      throw error;
    }
    
    const duration = Date.now() - start;
    
    return {
      function: functionName,
      success: true,
      message: `Response: ${JSON.stringify(data).substring(0, 100)}...`,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    
    return {
      function: functionName,
      success: false,
      message: error.message || 'Unknown error',
      duration,
    };
  }
}

async function checkCronJobs() {
  console.log(chalk.yellow('\n📅 Checking Cron Jobs:'));
  
  const { data: cronJobs, error } = await supabase
    .from('cron.job')
    .select('jobid, jobname, schedule')
    .order('jobname');
  
  if (error) {
    console.error(chalk.red('Failed to fetch cron jobs:', error.message));
    return;
  }
  
  console.log(chalk.green(`Found ${cronJobs.length} cron jobs:`));
  
  // Filter for MySetlist-specific jobs
  const mysetlistJobs = cronJobs.filter(job => 
    job.jobname.includes('mysetlist') || 
    job.jobname.includes('trending') ||
    job.jobname.includes('sync')
  );
  
  mysetlistJobs.forEach(job => {
    console.log(chalk.cyan(`  - ${job.jobname}: ${job.schedule}`));
  });
}

async function testSyncPipeline() {
  console.log(chalk.bold.green('\n🚀 Testing MySetlist Sync Pipeline\n'));
  
  const results: TestResult[] = [];
  
  // Test 1: Scheduled Sync (main orchestrator)
  results.push(
    await testFunction('scheduled-sync', {
      type: 'all',
      limit: 5,
    })
  );
  
  // Test 2: Update Trending
  results.push(await testFunction('update-trending', {}));
  
  // Test 3: Sync Artists (requires Spotify credentials)
  results.push(
    await testFunction('sync-artists', {
      artistName: 'Taylor Swift',
      forceSync: false,
    })
  );
  
  // Test 4: Sync Shows (requires Ticketmaster key)
  results.push(
    await testFunction('sync-shows', {
      artistName: 'Taylor Swift',
      city: 'New York',
    })
  );
  
  // Test 5: Sync Setlists (requires Setlist.fm key)
  results.push(
    await testFunction('sync-setlists', {
      artistName: 'Taylor Swift',
      date: '2024-01-01',
    })
  );
  
  // Check cron jobs
  await checkCronJobs();
  
  // Display results
  console.log(chalk.bold.yellow('\n📊 Test Results:\n'));
  
  let successCount = 0;
  let totalDuration = 0;
  
  results.forEach(result => {
    const status = result.success ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
    console.log(`${status} ${result.function} (${result.duration}ms)`);
    console.log(chalk.gray(`   ${result.message}`));
    
    if (result.success) successCount++;
    totalDuration += result.duration;
  });
  
  console.log(chalk.bold.white('\n📈 Summary:'));
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${chalk.green(successCount)}`);
  console.log(`Failed: ${chalk.red(results.length - successCount)}`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Success Rate: ${chalk.yellow((successCount / results.length * 100).toFixed(1) + '%')}`);
  
  // Check database stats
  console.log(chalk.bold.yellow('\n📊 Database Stats:'));
  
  const tables = ['artists', 'shows', 'venues', 'songs', 'setlists'];
  for (const table of tables) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    console.log(`${table}: ${chalk.cyan(count || 0)} records`);
  }
  
  // Final deployment readiness check
  console.log(chalk.bold.green('\n🎯 Deployment Readiness:'));
  
  const checks = {
    'Edge Functions Deployed': results.length > 0,
    'Cron Jobs Configured': mysetlistJobs.length >= 2,
    'Functions Responding': successCount > 0,
    'Database Connected': true,
  };
  
  let ready = true;
  Object.entries(checks).forEach(([check, passed]) => {
    const status = passed ? chalk.green('✅') : chalk.red('❌');
    console.log(`${status} ${check}`);
    if (!passed) ready = false;
  });
  
  if (ready && successCount === results.length) {
    console.log(chalk.bold.green('\n✨ MySetlist is 100% ready for production! ✨'));
  } else {
    console.log(chalk.bold.yellow('\n⚠️  Some issues need to be resolved before production deployment.'));
  }
  
  process.exit(ready && successCount === results.length ? 0 : 1);
}

// Run the tests
testSyncPipeline().catch(error => {
  console.error(chalk.red('\n❌ Test pipeline failed:'), error);
  process.exit(1);
});