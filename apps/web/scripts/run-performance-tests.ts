#!/usr/bin/env node
/**
 * Comprehensive Performance & Testing Suite Runner
 * Validates 100% GROK.md compliance with detailed reporting
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

interface TestSuiteResult {
  name: string;
  passed: boolean;
  duration: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  sloResults?: {
    allPassed: boolean;
    violations: Array<{
      sloKey: string;
      actualValue: number;
      threshold: number;
      margin: number;
    }>;
  };
  errors?: string[];
}

class PerformanceTestRunner {
  private results: TestSuiteResult[] = [];
  private startTime: number;
  private reportDir: string;

  constructor() {
    this.startTime = Date.now();
    this.reportDir = path.join(process.cwd(), 'test-results', 'performance');
  }

  async run(): Promise<void> {
    console.log('🚀 Starting GROK.md Performance & Testing Validation Suite');
    console.log('=' .repeat(80));

    await this.setupReportDirectory();

    try {
      // Run test suites in order of complexity
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runQualityValidationTests();
      await this.runE2ETests();
      await this.runAcceptanceTests();

      // Generate comprehensive report
      await this.generateComprehensiveReport();
      
      // Validate GROK.md compliance
      await this.validateGROKCompliance();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  private async setupReportDirectory(): Promise<void> {
    await fs.mkdir(this.reportDir, { recursive: true });
    console.log(`📁 Report directory: ${this.reportDir}`);
  }

  private async runUnitTests(): Promise<void> {
    console.log('\n🧪 Running Unit Tests...');
    console.log('-'.repeat(50));

    const result = await this.runVitest({
      config: 'vitest.performance.config.ts',
      include: ['__tests__/unit/**/*.test.ts'],
      coverage: true,
      timeout: 10000,
    });

    this.results.push({
      name: 'Unit Tests',
      ...result,
    });

    if (result.passed) {
      console.log('✅ Unit tests passed');
    } else {
      console.log('❌ Unit tests failed');
      throw new Error('Unit tests failed');
    }
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('\n🔗 Running Integration Tests...');
    console.log('-'.repeat(50));

    const result = await this.runVitest({
      config: 'vitest.performance.config.ts',
      include: ['__tests__/integration/**/*.test.ts'],
      coverage: true,
      timeout: 30000,
    });

    this.results.push({
      name: 'Integration Tests',
      ...result,
    });

    if (result.passed) {
      console.log('✅ Integration tests passed');
    } else {
      console.log('❌ Integration tests failed');
      throw new Error('Integration tests failed');
    }
  }

  private async runQualityValidationTests(): Promise<void> {
    console.log('\n🎯 Running Quality Validation Tests...');
    console.log('-'.repeat(50));

    const result = await this.runVitest({
      config: 'vitest.performance.config.ts',
      include: ['__tests__/quality/**/*.test.ts'],
      coverage: true,
      timeout: 45000,
    });

    this.results.push({
      name: 'Quality Validation Tests',
      ...result,
    });

    if (result.passed) {
      console.log('✅ Quality validation tests passed');
    } else {
      console.log('❌ Quality validation tests failed');
      throw new Error('Quality validation tests failed');
    }
  }

  private async runE2ETests(): Promise<void> {
    console.log('\n🌐 Running End-to-End Tests...');
    console.log('-'.repeat(50));

    const result = await this.runVitest({
      config: 'vitest.performance.config.ts',
      include: ['__tests__/e2e/**/*.test.ts'],
      coverage: false, // E2E tests don't contribute to coverage meaningfully
      timeout: 120000, // 2 minutes for complex flows
    });

    this.results.push({
      name: 'End-to-End Tests',
      ...result,
    });

    if (result.passed) {
      console.log('✅ End-to-end tests passed');
    } else {
      console.log('❌ End-to-end tests failed');
      throw new Error('End-to-end tests failed');
    }
  }

  private async runAcceptanceTests(): Promise<void> {
    console.log('\n🏆 Running Acceptance Tests...');
    console.log('-'.repeat(50));

    const result = await this.runVitest({
      config: 'vitest.performance.config.ts',
      include: ['__tests__/acceptance/**/*.test.ts'],
      coverage: false,
      timeout: 180000, // 3 minutes for complex artist scenarios
    });

    this.results.push({
      name: 'Acceptance Tests',
      ...result,
    });

    if (result.passed) {
      console.log('✅ Acceptance tests passed');
    } else {
      console.log('❌ Acceptance tests failed');
      throw new Error('Acceptance tests failed');
    }
  }

  private async runVitest(options: {
    config: string;
    include: string[];
    coverage: boolean;
    timeout: number;
  }): Promise<Omit<TestSuiteResult, 'name'>> {
    const startTime = Date.now();

    try {
      const args = [
        'vitest',
        'run',
        `--config=${options.config}`,
        `--testTimeout=${options.timeout}`,
        ...options.include.map(pattern => `--include=${pattern}`),
      ];

      if (options.coverage) {
        args.push('--coverage');
      }

      const result = execSync(`npx ${args.join(' ')}`, {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe',
      });

      const duration = Date.now() - startTime;

      // Parse coverage if available
      let coverage;
      if (options.coverage) {
        try {
          const coverageData = await this.parseCoverageReport();
          coverage = coverageData;
        } catch (error) {
          console.warn('⚠️  Could not parse coverage data:', error);
        }
      }

      // Parse SLO results from output
      const sloResults = this.parseSLOResults(result);

      return {
        passed: true,
        duration,
        coverage,
        sloResults,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        passed: false,
        duration,
        errors: [errorMessage],
      };
    }
  }

  private async parseCoverageReport(): Promise<TestSuiteResult['coverage']> {
    try {
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      const coverageData = JSON.parse(await fs.readFile(coveragePath, 'utf8'));
      
      return {
        lines: coverageData.total.lines.pct,
        functions: coverageData.total.functions.pct,
        branches: coverageData.total.branches.pct,
        statements: coverageData.total.statements.pct,
      };
    } catch (error) {
      throw new Error(`Failed to parse coverage report: ${error}`);
    }
  }

  private parseSLOResults(output: string): TestSuiteResult['sloResults'] {
    // Extract SLO validation results from test output
    const sloPattern = /SLO_VALIDATION:(.+?)END_SLO_VALIDATION/gs;
    const matches = Array.from(output.matchAll(sloPattern));

    if (matches.length === 0) {
      return { allPassed: true, violations: [] };
    }

    const violations: Array<{
      sloKey: string;
      actualValue: number;
      threshold: number;
      margin: number;
    }> = [];
    let allPassed = true;

    for (const match of matches) {
      try {
        if (!match[1]) continue;
        const sloData = JSON.parse(match[1]);
        if (!sloData.passed) {
          allPassed = false;
          violations.push({
            sloKey: sloData.sloKey,
            actualValue: sloData.actualValue,
            threshold: sloData.threshold,
            margin: sloData.margin,
          });
        }
      } catch (error) {
        console.warn('Could not parse SLO data:', error);
      }
    }

    return { allPassed, violations };
  }

  private async generateComprehensiveReport(): Promise<void> {
    console.log('\n📊 Generating Comprehensive Report...');
    console.log('-'.repeat(50));

    const totalDuration = Date.now() - this.startTime;
    const passedSuites = this.results.filter(r => r.passed).length;
    const totalSuites = this.results.length;

    const report = {
      summary: {
        totalSuites,
        passedSuites,
        failedSuites: totalSuites - passedSuites,
        totalDuration,
        timestamp: new Date().toISOString(),
        grokCompliant: passedSuites === totalSuites,
      },
      suites: this.results,
      sloSummary: this.generateSLOSummary(),
      coverageSummary: this.generateCoverageSummary(),
    };

    // Save JSON report
    const jsonReportPath = path.join(this.reportDir, 'performance-report.json');
    await fs.writeFile(jsonReportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReportPath = path.join(this.reportDir, 'performance-report.html');
    await this.generateHTMLReport(report, htmlReportPath);

    // Generate markdown summary
    const mdReportPath = path.join(this.reportDir, 'PERFORMANCE_SUMMARY.md');
    await this.generateMarkdownSummary(report, mdReportPath);

    console.log(`📄 Reports generated:`);
    console.log(`   JSON: ${jsonReportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
    console.log(`   Markdown: ${mdReportPath}`);
  }

  private generateSLOSummary() {
    const allSLOResults = this.results
      .map(r => r.sloResults)
      .filter((slo): slo is NonNullable<typeof slo> => Boolean(slo));

    const totalViolations = allSLOResults
      .flatMap(slo => slo.violations || []);

    return {
      totalSLOs: allSLOResults.length,
      passedSLOs: allSLOResults.filter(slo => slo.allPassed).length,
      violations: totalViolations,
      grokCompliant: totalViolations.length === 0,
    };
  }

  private generateCoverageSummary() {
    const coverageResults = this.results
      .map(r => r.coverage)
      .filter((cov): cov is NonNullable<typeof cov> => Boolean(cov));

    if (coverageResults.length === 0) {
      return null;
    }

    // Calculate weighted average coverage
    const totalCoverage = coverageResults.reduce((sum, cov) => ({
      lines: sum.lines + cov.lines,
      functions: sum.functions + cov.functions,
      branches: sum.branches + cov.branches,
      statements: sum.statements + cov.statements,
    }), { lines: 0, functions: 0, branches: 0, statements: 0 });

    const count = coverageResults.length;

    return {
      lines: totalCoverage.lines / count,
      functions: totalCoverage.functions / count,
      branches: totalCoverage.branches / count,
      statements: totalCoverage.statements / count,
      meetsThreshold: (totalCoverage.lines / count) >= 80,
    };
  }

  private async generateHTMLReport(report: any, filePath: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GROK.md Performance & Testing Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1, h2, h3 { color: #333; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; border-left: 4px solid #007bff; }
        .stat-card.success { border-left-color: #28a745; }
        .stat-card.warning { border-left-color: #ffc107; }
        .stat-card.danger { border-left-color: #dc3545; }
        .suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 6px; }
        .suite.passed { border-left: 4px solid #28a745; }
        .suite.failed { border-left: 4px solid #dc3545; }
        .badge { padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; }
        .badge.success { background: #28a745; color: white; }
        .badge.danger { background: #dc3545; color: white; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .violation { background-color: #fff5f5; border-left: 4px solid #dc3545; padding: 10px; margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 GROK.md Performance & Testing Report</h1>
        
        <div class="summary">
            <div class="stat-card ${report.summary.grokCompliant ? 'success' : 'danger'}">
                <h3>GROK.md Compliance</h3>
                <div style="font-size: 2em; font-weight: bold;">${report.summary.grokCompliant ? '✅' : '❌'}</div>
                <div>${report.summary.grokCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}</div>
            </div>
            <div class="stat-card">
                <h3>Test Suites</h3>
                <div style="font-size: 2em; font-weight: bold;">${report.summary.passedSuites}/${report.summary.totalSuites}</div>
                <div>Passed</div>
            </div>
            <div class="stat-card">
                <h3>Duration</h3>
                <div style="font-size: 2em; font-weight: bold;">${Math.round(report.summary.totalDuration / 1000)}s</div>
                <div>Total Time</div>
            </div>
            <div class="stat-card ${report.coverageSummary?.meetsThreshold ? 'success' : 'warning'}">
                <h3>Coverage</h3>
                <div style="font-size: 2em; font-weight: bold;">${report.coverageSummary ? Math.round(report.coverageSummary.lines) : 'N/A'}%</div>
                <div>Line Coverage</div>
            </div>
        </div>

        <h2>📋 Test Suite Results</h2>
        ${report.suites.map((suite: any) => `
            <div class="suite ${suite.passed ? 'passed' : 'failed'}">
                <h3>${suite.name} <span class="badge ${suite.passed ? 'success' : 'danger'}">${suite.passed ? 'PASSED' : 'FAILED'}</span></h3>
                <p><strong>Duration:</strong> ${suite.duration}ms</p>
                ${suite.coverage ? `
                    <p><strong>Coverage:</strong> 
                       Lines: ${suite.coverage.lines.toFixed(1)}%, 
                       Functions: ${suite.coverage.functions.toFixed(1)}%, 
                       Branches: ${suite.coverage.branches.toFixed(1)}%
                    </p>
                ` : ''}
                ${suite.errors ? `
                    <div class="violation">
                        <strong>Errors:</strong>
                        <ul>${suite.errors.map((error: string) => `<li>${error}</li>`).join('')}</ul>
                    </div>
                ` : ''}
            </div>
        `).join('')}

        <h2>🎯 SLO Compliance Summary</h2>
        <p><strong>Status:</strong> ${report.sloSummary.grokCompliant ? '✅ All SLOs Met' : '❌ SLO Violations Detected'}</p>
        ${report.sloSummary.violations.length > 0 ? `
            <h3>Violations:</h3>
            ${report.sloSummary.violations.map((violation: any) => `
                <div class="violation">
                    <strong>${violation.sloKey}:</strong> 
                    ${violation.actualValue}ms (threshold: ${violation.threshold}ms, 
                    over by ${Math.abs(violation.margin)}ms)
                </div>
            `).join('')}
        ` : '<p>✅ No SLO violations detected</p>'}

        <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; text-align: center;">
            Generated on ${new Date(report.summary.timestamp).toLocaleString()}
        </footer>
    </div>
</body>
</html>`;

    await fs.writeFile(filePath, html);
  }

  private async generateMarkdownSummary(report: any, filePath: string): Promise<void> {
    const md = `# GROK.md Performance & Testing Report

## Summary

- **GROK.md Compliance:** ${report.summary.grokCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}
- **Test Suites:** ${report.summary.passedSuites}/${report.summary.totalSuites} passed
- **Total Duration:** ${Math.round(report.summary.totalDuration / 1000)}s
- **Coverage:** ${report.coverageSummary ? Math.round(report.coverageSummary.lines) + '%' : 'N/A'}

## Test Suite Results

${report.suites.map((suite: any) => `
### ${suite.name} ${suite.passed ? '✅' : '❌'}

- **Status:** ${suite.passed ? 'PASSED' : 'FAILED'}
- **Duration:** ${suite.duration}ms
${suite.coverage ? `- **Coverage:** Lines: ${suite.coverage.lines.toFixed(1)}%, Functions: ${suite.coverage.functions.toFixed(1)}%, Branches: ${suite.coverage.branches.toFixed(1)}%` : ''}
${suite.errors ? `\n**Errors:**\n${suite.errors.map((error: string) => `- ${error}`).join('\n')}` : ''}
`).join('')}

## SLO Compliance

**Status:** ${report.sloSummary.grokCompliant ? '✅ All SLOs Met' : '❌ SLO Violations Detected'}

${report.sloSummary.violations.length > 0 ? `
### Violations:

${report.sloSummary.violations.map((violation: any) => 
  `- **${violation.sloKey}:** ${violation.actualValue}ms (threshold: ${violation.threshold}ms, over by ${Math.abs(violation.margin)}ms)`
).join('\n')}
` : '✅ No SLO violations detected'}

---
*Generated on ${new Date(report.summary.timestamp).toLocaleString()}*`;

    await fs.writeFile(filePath, md);
  }

  private async validateGROKCompliance(): Promise<void> {
    console.log('\n🔍 Validating GROK.md Compliance...');
    console.log('-'.repeat(50));

    const failedSuites = this.results.filter(r => !r.passed);
    const sloViolations = this.results.flatMap(r => r.sloResults?.violations || []);

    if (failedSuites.length > 0) {
      console.log('❌ GROK.md Compliance FAILED - Test failures detected:');
      failedSuites.forEach(suite => {
        console.log(`   - ${suite.name}: ${suite.errors?.join(', ')}`);
      });
      throw new Error('GROK.md compliance validation failed');
    }

    if (sloViolations.length > 0) {
      console.log('❌ GROK.md Compliance FAILED - SLO violations detected:');
      sloViolations.forEach(violation => {
        console.log(`   - ${violation.sloKey}: ${violation.actualValue}ms > ${violation.threshold}ms`);
      });
      throw new Error('GROK.md SLO compliance validation failed');
    }

    console.log('✅ GROK.md Compliance VALIDATED - All requirements met!');
    console.log('\n🎉 Performance & Testing Suite Complete!');
    console.log(`   Total time: ${Math.round((Date.now() - this.startTime) / 1000)}s`);
    console.log(`   All ${this.results.length} test suites passed`);
    console.log(`   0 SLO violations detected`);
    console.log(`   Report available at: ${this.reportDir}`);
  }
}

// Run the test suite
if (require.main === module) {
  const runner = new PerformanceTestRunner();
  runner.run().catch((error) => {
    console.error('❌ Performance test runner failed:', error);
    process.exit(1);
  });
}

export { PerformanceTestRunner };