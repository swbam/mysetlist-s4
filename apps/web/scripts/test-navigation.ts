#!/usr/bin/env node

/**
 * Navigation Route Verification Script
 * Tests all application routes to ensure they work correctly
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface RouteTest {
  path: string;
  expectedStatus: number;
  description: string;
  critical: boolean;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const ROUTES_TO_TEST: RouteTest[] = [
  // Core Pages
  { path: '/', expectedStatus: 200, description: 'Homepage', critical: true },
  { path: '/artists', expectedStatus: 200, description: 'Artists page', critical: true },
  { path: '/shows', expectedStatus: 200, description: 'Shows page', critical: true },
  { path: '/venues', expectedStatus: 200, description: 'Venues page', critical: true },
  { path: '/trending', expectedStatus: 200, description: 'Trending page', critical: true },
  
  // Auth Pages
  { path: '/auth/sign-in', expectedStatus: 200, description: 'Sign in page', critical: true },
  { path: '/auth/sign-up', expectedStatus: 200, description: 'Sign up page', critical: true },
  { path: '/auth/reset-password', expectedStatus: 200, description: 'Reset password page', critical: false },
  
  // User Pages
  { path: '/profile', expectedStatus: 200, description: 'Profile page', critical: false },
  { path: '/settings', expectedStatus: 200, description: 'Settings page', critical: false },
  { path: '/my-artists', expectedStatus: 200, description: 'My Artists page', critical: false },
  
  // Static Pages
  { path: '/about', expectedStatus: 200, description: 'About page', critical: false },
  { path: '/contact', expectedStatus: 200, description: 'Contact page', critical: false },
  { path: '/privacy', expectedStatus: 200, description: 'Privacy page', critical: false },
  { path: '/terms', expectedStatus: 200, description: 'Terms page', critical: false },
  
  // Error Pages
  { path: '/404-test-route', expectedStatus: 404, description: '404 handling', critical: true },
];

class NavigationTester {
  private results: Array<{
    path: string;
    status: number;
    success: boolean;
    error?: string;
    responseTime: number;
  }> = [];

  async testRoute(route: RouteTest): Promise<void> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${BASE_URL}${route.path}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'MySetlist Navigation Test',
        },
      });

      const responseTime = Date.now() - startTime;
      const success = response.status === route.expectedStatus;
      
      this.results.push({
        path: route.path,
        status: response.status,
        success,
        responseTime,
        error: success ? undefined : `Expected ${route.expectedStatus}, got ${response.status}`,
      });

      console.log(
        `${success ? '✅' : '❌'} ${route.path} - ${response.status} (${responseTime}ms) - ${route.description}`
      );
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.results.push({
        path: route.path,
        status: 0,
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      console.log(`❌ ${route.path} - ERROR (${responseTime}ms) - ${error}`);
    }
  }

  async testAllRoutes(): Promise<void> {
    console.log('🚀 Starting Navigation Route Testing...\n');
    console.log(`Base URL: ${BASE_URL}\n`);

    // Test routes in parallel for better performance
    const testPromises = ROUTES_TO_TEST.map(route => this.testRoute(route));
    await Promise.all(testPromises);

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n📊 Navigation Test Summary');
    console.log('═'.repeat(50));

    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = totalTests - passed;
    const criticalFailed = this.results.filter(r => !r.success && 
      ROUTES_TO_TEST.find(rt => rt.path === r.path)?.critical).length;

    console.log(`Total Routes Tested: ${totalTests}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🚨 Critical Failures: ${criticalFailed}`);

    // Performance metrics
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;
    const maxResponseTime = Math.max(...this.results.map(r => r.responseTime));
    const minResponseTime = Math.min(...this.results.map(r => r.responseTime));

    console.log(`\n⚡ Performance Metrics:`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Fastest Response: ${minResponseTime}ms`);
    console.log(`Slowest Response: ${maxResponseTime}ms`);

    // Failed routes details
    if (failed > 0) {
      console.log(`\n❌ Failed Routes:`);
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          const route = ROUTES_TO_TEST.find(rt => rt.path === r.path);
          console.log(`   ${r.path} - ${r.error} ${route?.critical ? '(CRITICAL)' : ''}`);
        });
    }

    // Performance warnings
    const slowRoutes = this.results.filter(r => r.responseTime > 2000);
    if (slowRoutes.length > 0) {
      console.log(`\n⚠️  Slow Routes (>2s):`);
      slowRoutes.forEach(r => {
        console.log(`   ${r.path} - ${r.responseTime}ms`);
      });
    }

    console.log('\n' + '═'.repeat(50));
    
    if (criticalFailed > 0) {
      console.log('🚨 CRITICAL FAILURES DETECTED - Navigation system needs immediate attention!');
      process.exit(1);
    } else if (failed > 0) {
      console.log('⚠️  Some routes failed - Review non-critical issues');
      process.exit(1);
    } else {
      console.log('🎉 All navigation tests passed!');
      process.exit(0);
    }
  }
}

// Health check function
async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking server health...');
  
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    console.log('⚠️  Server health check failed. Starting server...');
    
    try {
      await execAsync('npm run dev &');
      console.log('⏳ Waiting for server to start...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const retryHealth = await checkServerHealth();
      if (!retryHealth) {
        console.log('❌ Server failed to start. Please start the server manually.');
        process.exit(1);
      }
    } catch (error) {
      console.log('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  console.log('✅ Server is healthy');
  
  const tester = new NavigationTester();
  await tester.testAllRoutes();
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}

export { NavigationTester };