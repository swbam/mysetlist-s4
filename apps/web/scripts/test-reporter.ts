#!/usr/bin/env tsx

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

interface TestReport {
  suites: TestSuite[];
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  timestamp: string;
}

class TestReporter {
  private report: TestReport = {
    suites: [],
    totalTests: 0,
    totalPassed: 0,
    totalFailed: 0,
    totalSkipped: 0,
    totalDuration: 0,
    timestamp: new Date().toISOString(),
  };

  // Parse Jest results
  parseJestResults(jestResultsPath: string) {
    if (!existsSync(jestResultsPath)) {
      return;
    }

    const jestResults = JSON.parse(readFileSync(jestResultsPath, 'utf-8'));

    jestResults.testResults.forEach((suite: any) => {
      const testSuite: TestSuite = {
        name: suite.testFilePath,
        tests: [],
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: suite.perfStats.runtime,
      };

      suite.testResults.forEach((test: any) => {
        const result: TestResult = {
          name: test.title,
          status: test.status as 'passed' | 'failed' | 'skipped',
          duration: test.duration || 0,
          error: test.failureMessages?.join('\n'),
        };

        testSuite.tests.push(result);

        if (result.status === 'passed') {
          testSuite.passed++;
        } else if (result.status === 'failed') {
          testSuite.failed++;
        } else {
          testSuite.skipped++;
        }
      });

      this.report.suites.push(testSuite);
    });
  }

  // Parse Cypress results
  parseCypressResults(cypressResultsPath: string) {
    if (!existsSync(cypressResultsPath)) {
      return;
    }

    const cypressResults = JSON.parse(
      readFileSync(cypressResultsPath, 'utf-8')
    );

    cypressResults.runs.forEach((run: any) => {
      run.tests.forEach((spec: any) => {
        const testSuite: TestSuite = {
          name: spec.title.join(' > '),
          tests: [],
          passed: 0,
          failed: 0,
          skipped: 0,
          duration: spec.duration,
        };

        const result: TestResult = {
          name: spec.title.at(-1),
          status: spec.state as 'passed' | 'failed' | 'skipped',
          duration: spec.duration,
          error: spec.err?.message,
        };

        testSuite.tests.push(result);

        if (result.status === 'passed') {
          testSuite.passed++;
        } else if (result.status === 'failed') {
          testSuite.failed++;
        } else {
          testSuite.skipped++;
        }

        this.report.suites.push(testSuite);
      });
    });
  }

  // Calculate totals
  calculateTotals() {
    this.report.suites.forEach((suite) => {
      this.report.totalTests += suite.tests.length;
      this.report.totalPassed += suite.passed;
      this.report.totalFailed += suite.failed;
      this.report.totalSkipped += suite.skipped;
      this.report.totalDuration += suite.duration;
    });
  }

  // Generate markdown report
  generateMarkdownReport(): string {
    const {
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
    } = this.report;
    const passRate =
      totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : '0';

    let markdown = '# Test Report\n\n';
    markdown += `**Generated:** ${new Date(this.report.timestamp).toLocaleString()}\n\n`;

    // Summary
    markdown += '## Summary\n\n';
    markdown += '| Metric | Value |\n';
    markdown += '|--------|-------|\n';
    markdown += `| Total Tests | ${totalTests} |\n`;
    markdown += `| Passed | ✅ ${totalPassed} |\n`;
    markdown += `| Failed | ❌ ${totalFailed} |\n`;
    markdown += `| Skipped | ⏭️ ${totalSkipped} |\n`;
    markdown += `| Pass Rate | ${passRate}% |\n`;
    markdown += `| Duration | ${(totalDuration / 1000).toFixed(2)}s |\n\n`;

    // Test Suites
    markdown += '## Test Suites\n\n';

    this.report.suites.forEach((suite) => {
      const suitePassRate =
        suite.tests.length > 0
          ? ((suite.passed / suite.tests.length) * 100).toFixed(0)
          : '0';

      markdown += `### ${suite.name}\n`;
      markdown += `**Pass Rate:** ${suitePassRate}% | **Duration:** ${(suite.duration / 1000).toFixed(2)}s\n\n`;

      if (suite.failed > 0) {
        markdown += '#### Failed Tests:\n';
        suite.tests
          .filter((test) => test.status === 'failed')
          .forEach((test) => {
            markdown += `- ❌ **${test.name}**\n`;
            if (test.error) {
              markdown += `  \`\`\`\n  ${test.error}\n  \`\`\`\n`;
            }
          });
        markdown += '\n';
      }
    });

    return markdown;
  }

  // Generate JSON report
  generateJSONReport(): string {
    return JSON.stringify(this.report, null, 2);
  }

  // Generate GitHub Actions summary
  generateGitHubSummary(): string {
    const { totalTests, totalPassed, totalFailed, totalSkipped } = this.report;
    let summary = '';

    if (totalFailed > 0) {
      summary += `❌ ${totalFailed} tests failed\n`;
    } else {
      summary += '✅ All tests passed!\n';
    }

    summary += `📊 ${totalPassed}/${totalTests} tests passed (${totalSkipped} skipped)\n`;

    return summary;
  }

  // Main execution
  async run() {
    // Parse different test results
    this.parseJestResults('jest-results.json');
    this.parseCypressResults('cypress/results/results.json');

    // Calculate totals
    this.calculateTotals();

    // Generate reports
    const markdownReport = this.generateMarkdownReport();
    const jsonReport = this.generateJSONReport();

    // Write reports
    writeFileSync('test-report.md', markdownReport);
    writeFileSync('test-report.json', jsonReport);

    // Output for GitHub Actions
    if (process.env['GITHUB_ACTIONS']) {
      if (this.report.totalFailed > 0) {
        process.exit(1);
      }
    } else {
    }
  }
}

// Run the reporter
const reporter = new TestReporter();
reporter.run().catch(console.error);
