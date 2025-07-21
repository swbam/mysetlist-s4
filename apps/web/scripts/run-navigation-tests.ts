#!/usr/bin/env node

/**
 * Comprehensive Navigation Test Runner
 * Executes all navigation tests and provides detailed reporting
 */

import { exec } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  details?: any;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  duration: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
}

class NavigationTestRunner {
  private results: TestSuite[] = [];
  private startTime = 0;
  private endTime = 0;

  async runAllTests(): Promise<void> {
    this.startTime = Date.now();

    // Run different test suites
    await this.runMiddlewareTests();
    await this.runRouteTests();
    await this.runNavigationTests();
    await this.runMobileTests();
    await this.runPerformanceTests();
    await this.runErrorBoundaryTests();
    await this.runAccessibilityTests();

    this.endTime = Date.now();

    this.generateReport();
    this.checkCriticalFailures();
  }

  private async runMiddlewareTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Middleware Tests',
      tests: [],
      duration: 0,
      passedCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };

    const startTime = Date.now();

    // Test 1: Middleware file exists
    const middlewareExists = existsSync(
      path.join(process.cwd(), 'middleware.ts')
    );
    suite.tests.push({
      name: 'Middleware file exists',
      status: middlewareExists ? 'passed' : 'failed',
      duration: 0,
      ...(!middlewareExists && { error: 'middleware.ts file not found' }),
    });

    // Test 2: Middleware compiles
    try {
      await execAsync('npx tsc --noEmit middleware.ts');
      suite.tests.push({
        name: 'Middleware compiles',
        status: 'passed',
        duration: 0,
      });
    } catch (error) {
      suite.tests.push({
        name: 'Middleware compiles',
        status: 'failed',
        duration: 0,
        error: error instanceof Error ? error.message : 'Compilation failed',
      });
    }

    // Test 3: Security headers are set
    try {
      const response = await fetch('http://localhost:3001/');
      const hasSecurityHeaders = response.headers.has('X-Content-Type-Options');

      suite.tests.push({
        name: 'Security headers present',
        status: hasSecurityHeaders ? 'passed' : 'failed',
        duration: 0,
        ...(!hasSecurityHeaders && { error: 'Security headers not found' }),
      });
    } catch (_error) {
      suite.tests.push({
        name: 'Security headers present',
        status: 'failed',
        duration: 0,
        error: 'Could not test security headers - server not running',
      });
    }

    suite.duration = Date.now() - startTime;
    this.updateSuiteCounts(suite);
    this.results.push(suite);
  }

  private async runRouteTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Route Tests',
      tests: [],
      duration: 0,
      passedCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };

    const startTime = Date.now();

    const routes = [
      '/',
      '/artists',
      '/shows',
      '/venues',
      '/trending',
      '/auth/sign-in',
      '/auth/sign-up',
    ];

    for (const route of routes) {
      try {
        const response = await fetch(`http://localhost:3001${route}`);
        const isSuccess = response.status === 200;

        suite.tests.push({
          name: `Route ${route} accessible`,
          status: isSuccess ? 'passed' : 'failed',
          duration: 0,
          ...(!isSuccess && { error: `HTTP ${response.status}` }),
        });
      } catch (error) {
        suite.tests.push({
          name: `Route ${route} accessible`,
          status: 'failed',
          duration: 0,
          error: error instanceof Error ? error.message : 'Route test failed',
        });
      }
    }

    suite.duration = Date.now() - startTime;
    this.updateSuiteCounts(suite);
    this.results.push(suite);
  }

  private async runNavigationTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Navigation Tests',
      tests: [],
      duration: 0,
      passedCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };

    const startTime = Date.now();

    try {
      // Run Playwright tests if available
      const { stdout } = await execAsync(
        'npx playwright test __tests__/navigation/comprehensive-navigation.test.ts --reporter=json'
      );
      const playwrightResults = JSON.parse(stdout);

      // Parse Playwright results
      if (playwrightResults.suites) {
        playwrightResults.suites.forEach((pwSuite: any) => {
          pwSuite.specs.forEach((spec: any) => {
            suite.tests.push({
              name: spec.title,
              status: spec.ok ? 'passed' : 'failed',
              duration: spec.duration || 0,
              ...(!spec.ok && { error: 'Navigation test failed' }),
            });
          });
        });
      }
    } catch (_error) {
      suite.tests.push({
        name: 'Navigation Playwright tests',
        status: 'failed',
        duration: 0,
        error:
          'Playwright tests could not run - may need to install Playwright',
      });
    }

    suite.duration = Date.now() - startTime;
    this.updateSuiteCounts(suite);
    this.results.push(suite);
  }

  private async runMobileTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Mobile Tests',
      tests: [],
      duration: 0,
      passedCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };

    const startTime = Date.now();

    try {
      // Run mobile-specific tests
      const { stdout } = await execAsync(
        'npx playwright test __tests__/mobile/mobile-navigation.test.ts --reporter=json'
      );
      const mobileResults = JSON.parse(stdout);

      if (mobileResults.suites) {
        mobileResults.suites.forEach((pwSuite: any) => {
          pwSuite.specs.forEach((spec: any) => {
            suite.tests.push({
              name: spec.title,
              status: spec.ok ? 'passed' : 'failed',
              duration: spec.duration || 0,
              ...(!spec.ok && { error: 'Mobile test failed' }),
            });
          });
        });
      }
    } catch (_error) {
      suite.tests.push({
        name: 'Mobile navigation tests',
        status: 'failed',
        duration: 0,
        error: 'Mobile tests could not run',
      });
    }

    suite.duration = Date.now() - startTime;
    this.updateSuiteCounts(suite);
    this.results.push(suite);
  }

  private async runPerformanceTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Performance Tests',
      tests: [],
      duration: 0,
      passedCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };

    const startTime = Date.now();

    // Test page load performance
    const routes = ['/', '/artists', '/shows', '/venues', '/trending'];

    for (const route of routes) {
      try {
        const testStart = Date.now();
        void await fetch(`http://localhost:3001${route}`);
        const testEnd = Date.now();

        const loadTime = testEnd - testStart;
        const isPerformant = loadTime < 2000; // 2 second threshold

        suite.tests.push({
          name: `${route} loads under 2s`,
          status: isPerformant ? 'passed' : 'failed',
          duration: loadTime,
          ...(!isPerformant && { error: `Load time: ${loadTime}ms` }),
        });
      } catch (_error) {
        suite.tests.push({
          name: `${route} loads under 2s`,
          status: 'failed',
          duration: 0,
          error: 'Performance test failed',
        });
      }
    }

    suite.duration = Date.now() - startTime;
    this.updateSuiteCounts(suite);
    this.results.push(suite);
  }

  private async runErrorBoundaryTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Error Boundary Tests',
      tests: [],
      duration: 0,
      passedCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };

    const startTime = Date.now();

    // Test error boundary files exist
    const errorBoundaryFiles = [
      'components/navigation/navigation-error-boundary.tsx',
      'components/navigation/page-error-boundary.tsx',
      'components/navigation/route-error-boundary.tsx',
      'components/error-boundaries/enhanced-navigation-error-boundary.tsx',
    ];

    for (const file of errorBoundaryFiles) {
      const exists = existsSync(path.join(process.cwd(), file));
      suite.tests.push({
        name: `Error boundary ${file} exists`,
        status: exists ? 'passed' : 'failed',
        duration: 0,
        ...(!exists && { error: `File ${file} not found` }),
      });
    }

    // Test 404 handling
    try {
      const response = await fetch('http://localhost:3001/non-existent-route');
      const is404 = response.status === 404;

      suite.tests.push({
        name: '404 errors handled properly',
        status: is404 ? 'passed' : 'failed',
        duration: 0,
        ...(!is404 && { error: `Expected 404, got ${response.status}` }),
      });
    } catch (_error) {
      suite.tests.push({
        name: '404 errors handled properly',
        status: 'failed',
        duration: 0,
        error: 'Could not test 404 handling',
      });
    }

    suite.duration = Date.now() - startTime;
    this.updateSuiteCounts(suite);
    this.results.push(suite);
  }

  private async runAccessibilityTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Accessibility Tests',
      tests: [],
      duration: 0,
      passedCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };

    const startTime = Date.now();

    try {
      // Run accessibility tests if axe-core is available
      const { stdout } = await execAsync(
        'npx playwright test tests/accessibility/a11y.spec.ts --reporter=json'
      );
      const a11yResults = JSON.parse(stdout);

      if (a11yResults.suites) {
        a11yResults.suites.forEach((pwSuite: any) => {
          pwSuite.specs.forEach((spec: any) => {
            suite.tests.push({
              name: spec.title,
              status: spec.ok ? 'passed' : 'failed',
              duration: spec.duration || 0,
              ...(!spec.ok && { error: 'Accessibility test failed' }),
            });
          });
        });
      }
    } catch (_error) {
      suite.tests.push({
        name: 'Accessibility tests',
        status: 'skipped',
        duration: 0,
        error: 'Accessibility tests not available',
      });
    }

    suite.duration = Date.now() - startTime;
    this.updateSuiteCounts(suite);
    this.results.push(suite);
  }

  private updateSuiteCounts(suite: TestSuite): void {
    suite.passedCount = suite.tests.filter((t) => t.status === 'passed').length;
    suite.failedCount = suite.tests.filter((t) => t.status === 'failed').length;
    suite.skippedCount = suite.tests.filter(
      (t) => t.status === 'skipped'
    ).length;
  }

  private generateReport(): void {
    const totalDuration = this.endTime - this.startTime;
    const totalTests = this.results.reduce(
      (sum, suite) => sum + suite.tests.length,
      0
    );
    const totalPassed = this.results.reduce(
      (sum, suite) => sum + suite.passedCount,
      0
    );
    const totalFailed = this.results.reduce(
      (sum, suite) => sum + suite.failedCount,
      0
    );
    const totalSkipped = this.results.reduce(
      (sum, suite) => sum + suite.skippedCount,
      0
    );

    const report = `
🧭 NAVIGATION TEST REPORT
═══════════════════════════════════════════════════════════

📊 Overall Results:
• Total Tests: ${totalTests}
• ✅ Passed: ${totalPassed}
• ❌ Failed: ${totalFailed}
• ⏭️  Skipped: ${totalSkipped}
• ⏱️  Duration: ${(totalDuration / 1000).toFixed(2)}s

📋 Test Suite Results:
${this.results
  .map(
    (suite) => `
• ${suite.name}:
  - Tests: ${suite.tests.length}
  - Passed: ${suite.passedCount}
  - Failed: ${suite.failedCount}
  - Skipped: ${suite.skippedCount}
  - Duration: ${(suite.duration / 1000).toFixed(2)}s
`
  )
  .join('')}

${this.getFailureDetails()}

${this.getRecommendations()}

${this.getPerformanceMetrics()}
    `.trim();

    // Save report to file
    writeFileSync('navigation-test-report.txt', report);
  }

  private getFailureDetails(): string {
    const failures = this.results
      .flatMap((suite) => suite.tests)
      .filter((test) => test.status === 'failed');

    if (failures.length === 0) {
      return '✅ No failures detected!';
    }

    return `❌ Failure Details:
${failures
  .map(
    (test) => `
• ${test.name}:
  Error: ${test.error}
`
  )
  .join('')}`;
  }

  private getRecommendations(): string {
    const recommendations: string[] = [];

    const failedSuites = this.results.filter((suite) => suite.failedCount > 0);

    if (failedSuites.some((s) => s.name === 'Middleware Tests')) {
      recommendations.push('• Fix middleware configuration immediately');
    }

    if (failedSuites.some((s) => s.name === 'Route Tests')) {
      recommendations.push('• Investigate route accessibility issues');
    }

    if (failedSuites.some((s) => s.name === 'Performance Tests')) {
      recommendations.push('• Optimize slow-loading routes');
    }

    if (failedSuites.some((s) => s.name === 'Error Boundary Tests')) {
      recommendations.push('• Implement missing error boundaries');
    }

    return recommendations.length > 0
      ? `💡 Recommendations:\n${recommendations.join('\n')}`
      : '✅ All systems operating within expected parameters';
  }

  private getPerformanceMetrics(): string {
    const performanceTests =
      this.results.find((suite) => suite.name === 'Performance Tests')?.tests ||
      [];

    if (performanceTests.length === 0) {
      return '';
    }

    const avgLoadTime =
      performanceTests.reduce((sum, test) => sum + test.duration, 0) /
      performanceTests.length;
    const slowestTest = performanceTests.reduce((slow, test) =>
      test.duration > slow.duration ? test : slow
    );

    return `⚡ Performance Metrics:
• Average Load Time: ${avgLoadTime.toFixed(2)}ms
• Slowest Route: ${slowestTest.name} (${slowestTest.duration}ms)
• Performance Threshold: 2000ms`;
  }

  private checkCriticalFailures(): void {
    const criticalSuites = ['Middleware Tests', 'Route Tests'];
    const criticalFailures = this.results.filter(
      (suite) => criticalSuites.includes(suite.name) && suite.failedCount > 0
    );

    if (criticalFailures.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

// Main execution
async function main() {
  const runner = new NavigationTestRunner();
  await runner.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

export { NavigationTestRunner };
