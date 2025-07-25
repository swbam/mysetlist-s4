#!/usr/bin/env tsx

/**
 * Post-Deployment Test Script
 * 
 * This script performs comprehensive tests after deployment to verify:
 * - All pages load correctly without errors
 * - Search functionality works
 * - Database queries execute properly
 * - API endpoints respond correctly
 * - No 500 errors occur
 */

import { chromium } from 'playwright';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
const TIMEOUT = 30000; // 30 seconds

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Test results tracking
interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  duration: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

// Logging utilities
const log = {
  info: (msg: string) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}[✓]${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}[✗]${colors.reset} ${msg}`),
  section: (msg: string) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}`),
  detail: (msg: string) => console.log(`    ${colors.yellow}→${colors.reset} ${msg}`),
};

// Record test result
function recordResult(name: string, status: 'pass' | 'fail', duration: number, error?: string, details?: any) {
  results.push({ name, status, duration, error, details });
  
  if (status === 'pass') {
    log.success(`${name} (${duration}ms)`);
  } else {
    log.error(`${name} (${duration}ms)`);
    if (error) {
      log.detail(`Error: ${error}`);
    }
  }
  
  if (details) {
    Object.entries(details).forEach(([key, value]) => {
      log.detail(`${key}: ${value}`);
    });
  }
}

// Test API endpoint
async function testAPIEndpoint(path: string, expectedStatus = 200): Promise<boolean> {
  const startTime = Date.now();
  const url = `${BASE_URL}${path}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MySetlist-PostDeployment-Test/1.0',
      },
      timeout: TIMEOUT,
    });
    
    const duration = Date.now() - startTime;
    
    if (response.status === expectedStatus) {
      let details: any = { status: response.status };
      
      // Try to parse JSON response
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          details.dataReceived = true;
          details.recordCount = Array.isArray(data) ? data.length : 
                               (data.results ? data.results.length : 
                               (data.data ? (Array.isArray(data.data) ? data.data.length : 'object') : 'unknown'));
        }
      } catch (e) {
        // Not JSON, that's okay
      }
      
      recordResult(`API: ${path}`, 'pass', duration, undefined, details);
      return true;
    } else {
      recordResult(`API: ${path}`, 'fail', duration, `Expected status ${expectedStatus}, got ${response.status}`);
      return false;
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    recordResult(`API: ${path}`, 'fail', duration, err instanceof Error ? err.message : 'Unknown error');
    return false;
  }
}

// Test page load with Playwright
async function testPageLoad(browser: any, path: string, checkContent?: string[]): Promise<boolean> {
  const startTime = Date.now();
  const url = `${BASE_URL}${path}`;
  let page: any;
  
  try {
    page = await browser.newPage();
    
    // Set up console error tracking
    const consoleErrors: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to page
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: TIMEOUT,
    });
    
    const duration = Date.now() - startTime;
    
    if (!response) {
      recordResult(`Page: ${path}`, 'fail', duration, 'No response received');
      return false;
    }
    
    const status = response.status();
    
    if (status >= 500) {
      recordResult(`Page: ${path}`, 'fail', duration, `Server error: ${status}`);
      return false;
    }
    
    if (status >= 400) {
      recordResult(`Page: ${path}`, 'fail', duration, `Client error: ${status}`);
      return false;
    }
    
    // Check for specific content if provided
    if (checkContent && checkContent.length > 0) {
      for (const content of checkContent) {
        const found = await page.locator(`text=${content}`).count() > 0;
        if (!found) {
          recordResult(`Page: ${path}`, 'fail', duration, `Expected content not found: "${content}"`);
          await page.close();
          return false;
        }
      }
    }
    
    // Check for console errors
    if (consoleErrors.length > 0) {
      recordResult(`Page: ${path}`, 'fail', duration, 'Console errors detected', {
        errors: consoleErrors.slice(0, 3).join('; ')
      });
      await page.close();
      return false;
    }
    
    recordResult(`Page: ${path}`, 'pass', duration, undefined, {
      status,
      title: await page.title(),
    });
    
    await page.close();
    return true;
  } catch (err) {
    const duration = Date.now() - startTime;
    recordResult(`Page: ${path}`, 'fail', duration, err instanceof Error ? err.message : 'Unknown error');
    if (page) {
      await page.close().catch(() => {});
    }
    return false;
  }
}

// Test search functionality
async function testSearchFunctionality(): Promise<boolean> {
  log.section('Search Functionality');
  
  const testQueries = ['Taylor Swift', 'Concert', 'Madison Square Garden'];
  let allPassed = true;
  
  for (const query of testQueries) {
    const passed = await testAPIEndpoint(`/api/search?q=${encodeURIComponent(query)}`);
    if (!passed) allPassed = false;
  }
  
  return allPassed;
}

// Test database queries
async function testDatabaseQueries(): Promise<boolean> {
  log.section('Database Queries');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    recordResult('Database: Connection', 'fail', 0, 'Missing Supabase credentials');
    return false;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  let allPassed = true;
  
  // Test queries
  const queries = [
    {
      name: 'Artists Query',
      query: async () => supabase.from('artists').select('*').limit(10),
    },
    {
      name: 'Shows Query',
      query: async () => supabase.from('shows').select('*').limit(10),
    },
    {
      name: 'Venues Query',
      query: async () => supabase.from('venues').select('*').limit(10),
    },
    {
      name: 'Trending Artists',
      query: async () => supabase
        .from('artists')
        .select('*')
        .order('trending_score', { ascending: false })
        .limit(10),
    },
  ];
  
  for (const { name, query } of queries) {
    const startTime = Date.now();
    try {
      const { data, error } = await query();
      const duration = Date.now() - startTime;
      
      if (error) {
        recordResult(`Database: ${name}`, 'fail', duration, error.message);
        allPassed = false;
      } else {
        recordResult(`Database: ${name}`, 'pass', duration, undefined, {
          recordCount: data?.length || 0,
        });
      }
    } catch (err) {
      const duration = Date.now() - startTime;
      recordResult(`Database: ${name}`, 'fail', duration, err instanceof Error ? err.message : 'Unknown error');
      allPassed = false;
    }
  }
  
  return allPassed;
}

// Test critical user journeys
async function testUserJourneys(browser: any): Promise<boolean> {
  log.section('Critical User Journeys');
  
  let allPassed = true;
  
  // Test 1: Homepage → Search → Artist Page
  try {
    const page = await browser.newPage();
    const startTime = Date.now();
    
    // Go to homepage
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    // Find and use search
    const searchInput = await page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (searchInput) {
      await searchInput.fill('Taylor Swift');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000); // Wait for results
      
      // Check if results appeared
      const hasResults = await page.locator('[data-testid="search-results"], .search-results, [class*="result"]').count() > 0;
      
      const duration = Date.now() - startTime;
      if (hasResults) {
        recordResult('Journey: Search Flow', 'pass', duration);
      } else {
        recordResult('Journey: Search Flow', 'fail', duration, 'No search results found');
        allPassed = false;
      }
    } else {
      recordResult('Journey: Search Flow', 'fail', Date.now() - startTime, 'Search input not found');
      allPassed = false;
    }
    
    await page.close();
  } catch (err) {
    recordResult('Journey: Search Flow', 'fail', 0, err instanceof Error ? err.message : 'Unknown error');
    allPassed = false;
  }
  
  return allPassed;
}

// Performance check
async function testPerformance(): Promise<boolean> {
  log.section('Performance Metrics');
  
  const startTime = Date.now();
  try {
    const response = await fetch(BASE_URL, {
      headers: {
        'User-Agent': 'MySetlist-PostDeployment-Test/1.0',
      },
      timeout: TIMEOUT,
    });
    
    const duration = Date.now() - startTime;
    
    if (duration < 3000) {
      recordResult('Performance: Homepage Load', 'pass', duration, undefined, {
        metric: 'Response time < 3s',
      });
      return true;
    } else {
      recordResult('Performance: Homepage Load', 'fail', duration, 'Response time > 3s');
      return false;
    }
  } catch (err) {
    recordResult('Performance: Homepage Load', 'fail', Date.now() - startTime, err instanceof Error ? err.message : 'Unknown error');
    return false;
  }
}

// Main test execution
async function runTests() {
  console.log(`${colors.magenta}🧪 MySetlist Post-Deployment Tests${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(40)}${colors.reset}`);
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log();
  
  let browser: any;
  
  try {
    // Launch browser for UI tests
    log.info('Launching browser for UI tests...');
    browser = await chromium.launch({
      headless: true,
      timeout: TIMEOUT,
    });
    
    // Test API Endpoints
    log.section('API Endpoints');
    await testAPIEndpoint('/api/health');
    await testAPIEndpoint('/api/health/comprehensive');
    await testAPIEndpoint('/api/trending/artists');
    await testAPIEndpoint('/api/trending/shows');
    await testAPIEndpoint('/api/search?q=test');
    
    // Test Page Loads
    log.section('Page Load Tests');
    await testPageLoad(browser, '/', ['MySetlist']);
    await testPageLoad(browser, '/artists');
    await testPageLoad(browser, '/shows');
    await testPageLoad(browser, '/trending');
    await testPageLoad(browser, '/auth/sign-in', ['Sign in', 'Email']);
    
    // Test Search
    await testSearchFunctionality();
    
    // Test Database
    await testDatabaseQueries();
    
    // Test User Journeys
    await testUserJourneys(browser);
    
    // Test Performance
    await testPerformance();
    
  } catch (err) {
    log.error('Fatal error during tests:');
    console.error(err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Generate summary
  generateSummary();
}

// Generate test summary
function generateSummary() {
  log.section('Test Summary');
  
  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const totalCount = results.length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`\n${colors.cyan}Total Tests:${colors.reset} ${totalCount}`);
  console.log(`${colors.green}Passed:${colors.reset} ${passCount}`);
  console.log(`${colors.red}Failed:${colors.reset} ${failCount}`);
  console.log(`${colors.magenta}Success Rate:${colors.reset} ${Math.round((passCount / totalCount) * 100)}%`);
  console.log(`${colors.blue}Total Duration:${colors.reset} ${totalDuration}ms`);
  
  if (failCount > 0) {
    console.log(`\n${colors.red}❌ DEPLOYMENT VERIFICATION FAILED${colors.reset}`);
    console.log('The following tests failed:');
    results
      .filter(r => r.status === 'fail')
      .forEach(r => {
        console.log(`  • ${r.name}: ${r.error || 'Unknown error'}`);
      });
    console.log('\nACTION REQUIRED: Investigate and fix these issues immediately.');
  } else {
    console.log(`\n${colors.green}✅ ALL TESTS PASSED!${colors.reset}`);
    console.log('Deployment verified successfully. Application is functioning correctly.');
  }
  
  // Save detailed results to file
  const resultsFile = `test-results-${new Date().toISOString().replace(/:/g, '-')}.json`;
  require('fs').writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      total: totalCount,
      passed: passCount,
      failed: failCount,
      duration: totalDuration,
    },
    results: results,
  }, null, 2));
  
  console.log(`\nDetailed results saved to: ${resultsFile}`);
  
  process.exit(failCount > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);