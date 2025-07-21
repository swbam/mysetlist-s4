#!/usr/bin/env node

/**
 * Navigation Route Verification Script
 * Tests all application routes to ensure they work correctly
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

interface RouteTest {
  path: string;
  expectedStatus: number;
  description: string;
  critical: boolean;
}

const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] || 'http://localhost:3001';

const ROUTES_TO_TEST: RouteTest[] = [
  // Core Pages
  { path: '/', expectedStatus: 200, description: 'Homepage', critical: true },
  {
    path: '/artists',
    expectedStatus: 200,
    description: 'Artists page',
    critical: true,
  },
  {
    path: '/shows',
    expectedStatus: 200,
    description: 'Shows page',
    critical: true,
  },
  {
    path: '/venues',
    expectedStatus: 200,
    description: 'Venues page',
    critical: true,
  },
  {
    path: '/trending',
    expectedStatus: 200,
    description: 'Trending page',
    critical: true,
  },

  // Auth Pages
  {
    path: '/auth/sign-in',
    expectedStatus: 200,
    description: 'Sign in page',
    critical: true,
  },
  {
    path: '/auth/sign-up',
    expectedStatus: 200,
    description: 'Sign up page',
    critical: true,
  },
  {
    path: '/auth/reset-password',
    expectedStatus: 200,
    description: 'Reset password page',
    critical: false,
  },

  // User Pages
  {
    path: '/profile',
    expectedStatus: 200,
    description: 'Profile page',
    critical: false,
  },
  {
    path: '/settings',
    expectedStatus: 200,
    description: 'Settings page',
    critical: false,
  },
  {
    path: '/my-artists',
    expectedStatus: 200,
    description: 'My Artists page',
    critical: false,
  },

  // Static Pages
  {
    path: '/about',
    expectedStatus: 200,
    description: 'About page',
    critical: false,
  },
  {
    path: '/contact',
    expectedStatus: 200,
    description: 'Contact page',
    critical: false,
  },
  {
    path: '/privacy',
    expectedStatus: 200,
    description: 'Privacy page',
    critical: false,
  },
  {
    path: '/terms',
    expectedStatus: 200,
    description: 'Terms page',
    critical: false,
  },

  // Error Pages
  {
    path: '/404-test-route',
    expectedStatus: 404,
    description: '404 handling',
    critical: true,
  },
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
        ...(!success && { error: `Expected ${route.expectedStatus}, got ${response.status}` }),
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.results.push({
        path: route.path,
        status: 0,
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async testAllRoutes(): Promise<void> {
    // Test routes in parallel for better performance
    const testPromises = ROUTES_TO_TEST.map((route) => this.testRoute(route));
    await Promise.all(testPromises);

    this.printSummary();
  }

  private printSummary(): void {
    const totalTests = this.results.length;
    const passed = this.results.filter((r) => r.success).length;
    const failed = totalTests - passed;
    const criticalFailed = this.results.filter(
      (r) =>
        !r.success && ROUTES_TO_TEST.find((rt) => rt.path === r.path)?.critical
    ).length;

    // Performance warnings
    const slowRoutes = this.results.filter((r) => r.responseTime > 2000);
    if (slowRoutes.length > 0) {
      // Log slow routes if needed in the future
    }

    if (criticalFailed > 0) {
      process.exit(1);
    } else if (failed > 0) {
      process.exit(1);
    } else {
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
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    try {
      await execAsync('npm run dev &');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const retryHealth = await checkServerHealth();
      if (!retryHealth) {
        process.exit(1);
      }
    } catch (_error) {
      process.exit(1);
    }
  }

  const tester = new NavigationTester();
  await tester.testAllRoutes();
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}

export { NavigationTester };
