#!/usr/bin/env tsx

/**
 * Comprehensive Quality Assurance Test Runner
 * Runs all testing suites and generates unified report
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  output: string;
  error?: string;
}

interface QAReport {
  timestamp: string;
  environment: {
    node: string;
    npm: string;
    os: string;
  };
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  results: TestResult[];
  recommendations: string[];
}

class ComprehensiveQARunner {
  private results: TestResult[] = [];
  private startTime: number = Date.now();

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Quality Assurance Suite...\n');
    console.log('=' .repeat(60));

    // Run all test suites
    await this.runUnitTests();
    await this.runIntegrationTests();
    await this.runAccessibilityTests();
    await this.runPerformanceTests();
    await this.runSecurityTests();
    await this.runE2ETests();
    await this.runLighthouseTests();
    await this.runProductionReadinessCheck();

    this.generateUnifiedReport();
  }

  private async runUnitTests(): Promise<void> {
    console.log('\n🧪 Running Unit Tests...');
    console.log('-'.repeat(30));

    const startTime = Date.now();
    try {
      const output = execSync('npm run test', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.results.push({
        name: 'Unit Tests',
        status: 'pass',
        duration: Date.now() - startTime,
        output,
      });
      
      console.log('✅ Unit tests passed');
    } catch (error) {
      this.results.push({
        name: 'Unit Tests',
        status: 'fail',
        duration: Date.now() - startTime,
        output: '',
        error: String(error),
      });
      
      console.log('❌ Unit tests failed');
    }
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('\n🔗 Running Integration Tests...');
    console.log('-'.repeat(30));

    const startTime = Date.now();
    try {
      const output = execSync('npm run test:integration', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.results.push({
        name: 'Integration Tests',
        status: 'pass',
        duration: Date.now() - startTime,
        output,
      });
      
      console.log('✅ Integration tests passed');
    } catch (error) {
      this.results.push({
        name: 'Integration Tests',
        status: 'fail',
        duration: Date.now() - startTime,
        output: '',
        error: String(error),
      });
      
      console.log('❌ Integration tests failed');
    }
  }

  private async runAccessibilityTests(): Promise<void> {
    console.log('\n♿ Running Accessibility Tests...');
    console.log('-'.repeat(30));

    const startTime = Date.now();
    try {
      const output = execSync('npx playwright test tests/accessibility/comprehensive-a11y.spec.ts', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.results.push({
        name: 'Accessibility Tests',
        status: 'pass',
        duration: Date.now() - startTime,
        output,
      });
      
      console.log('✅ Accessibility tests passed');
    } catch (error) {
      this.results.push({
        name: 'Accessibility Tests',
        status: 'fail',
        duration: Date.now() - startTime,
        output: '',
        error: String(error),
      });
      
      console.log('❌ Accessibility tests failed');
    }
  }

  private async runPerformanceTests(): Promise<void> {
    console.log('\n⚡ Running Performance Tests...');
    console.log('-'.repeat(30));

    const startTime = Date.now();
    try {
      // Check if server is running
      const serverCheck = execSync('curl -f http://localhost:3001 || echo "Server not running"', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });

      if (serverCheck.includes('Server not running')) {
        this.results.push({
          name: 'Performance Tests',
          status: 'skip',
          duration: Date.now() - startTime,
          output: 'Server not running - skipping performance tests',
        });
        
        console.log('⏭️  Performance tests skipped (server not running)');
        return;
      }

      const output = execSync('k6 run k6/load-test.js', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.results.push({
        name: 'Performance Tests',
        status: 'pass',
        duration: Date.now() - startTime,
        output,
      });
      
      console.log('✅ Performance tests passed');
    } catch (error) {
      this.results.push({
        name: 'Performance Tests',
        status: 'fail',
        duration: Date.now() - startTime,
        output: '',
        error: String(error),
      });
      
      console.log('❌ Performance tests failed');
    }
  }

  private async runSecurityTests(): Promise<void> {
    console.log('\n🔒 Running Security Tests...');
    console.log('-'.repeat(30));

    const startTime = Date.now();
    try {
      const output = execSync('tsx scripts/security-audit.ts', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.results.push({
        name: 'Security Tests',
        status: 'pass',
        duration: Date.now() - startTime,
        output,
      });
      
      console.log('✅ Security audit passed');
    } catch (error) {
      this.results.push({
        name: 'Security Tests',
        status: 'fail',
        duration: Date.now() - startTime,
        output: '',
        error: String(error),
      });
      
      console.log('❌ Security audit failed');
    }
  }

  private async runE2ETests(): Promise<void> {
    console.log('\n🎭 Running E2E Tests...');
    console.log('-'.repeat(30));

    const startTime = Date.now();
    try {
      const output = execSync('npm run cypress:headless', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.results.push({
        name: 'E2E Tests',
        status: 'pass',
        duration: Date.now() - startTime,
        output,
      });
      
      console.log('✅ E2E tests passed');
    } catch (error) {
      this.results.push({
        name: 'E2E Tests',
        status: 'fail',
        duration: Date.now() - startTime,
        output: '',
        error: String(error),
      });
      
      console.log('❌ E2E tests failed');
    }
  }

  private async runLighthouseTests(): Promise<void> {
    console.log('\n🏰 Running Lighthouse Tests...');
    console.log('-'.repeat(30));

    const startTime = Date.now();
    try {
      const output = execSync('npm run lighthouse:ci', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.results.push({
        name: 'Lighthouse Tests',
        status: 'pass',
        duration: Date.now() - startTime,
        output,
      });
      
      console.log('✅ Lighthouse tests passed');
    } catch (error) {
      this.results.push({
        name: 'Lighthouse Tests',
        status: 'fail',
        duration: Date.now() - startTime,
        output: '',
        error: String(error),
      });
      
      console.log('❌ Lighthouse tests failed');
    }
  }

  private async runProductionReadinessCheck(): Promise<void> {
    console.log('\n🚀 Running Production Readiness Check...');
    console.log('-'.repeat(30));

    const startTime = Date.now();
    try {
      const output = execSync('tsx scripts/production-readiness-check.ts', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.results.push({
        name: 'Production Readiness',
        status: 'pass',
        duration: Date.now() - startTime,
        output,
      });
      
      console.log('✅ Production readiness check passed');
    } catch (error) {
      this.results.push({
        name: 'Production Readiness',
        status: 'fail',
        duration: Date.now() - startTime,
        output: '',
        error: String(error),
      });
      
      console.log('❌ Production readiness check failed');
    }
  }

  private generateUnifiedReport(): void {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;

    const report: QAReport = {
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        npm: this.getPackageVersion('npm'),
        os: process.platform,
      },
      summary: {
        total: this.results.length,
        passed,
        failed,
        skipped,
        duration: totalDuration,
      },
      results: this.results,
      recommendations: this.generateRecommendations(),
    };

    // Console summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE QA REPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n⏱️  Total Duration: ${this.formatDuration(totalDuration)}`);
    console.log(`📋 Total Test Suites: ${report.summary.total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);

    const successRate = (passed / report.summary.total) * 100;
    console.log(`\n🎯 Success Rate: ${successRate.toFixed(1)}%`);

    // Detailed results
    console.log('\n📋 DETAILED RESULTS:');
    console.log('-'.repeat(40));
    
    this.results.forEach((result, index) => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
      const duration = this.formatDuration(result.duration);
      
      console.log(`${index + 1}. ${icon} ${result.name} (${duration})`);
      
      if (result.error) {
        console.log(`   Error: ${result.error.split('\n')[0]}`);
      }
    });

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('-'.repeat(40));
      
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    // Overall status
    console.log('\n' + '='.repeat(60));
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED - READY FOR PRODUCTION!');
    } else if (failed <= 2) {
      console.log('⚠️  SOME TESTS FAILED - REVIEW BEFORE PRODUCTION');
    } else {
      console.log('🚨 MULTIPLE TEST FAILURES - NOT READY FOR PRODUCTION');
    }
    console.log('='.repeat(60));

    // Save report
    const reportPath = join(process.cwd(), 'comprehensive-qa-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Save HTML report
    this.generateHTMLReport(report);
  }

  private generateRecommendations(): string[] {
    const recommendations = [];
    
    const failedTests = this.results.filter(r => r.status === 'fail');
    
    if (failedTests.some(t => t.name === 'Unit Tests')) {
      recommendations.push('Fix failing unit tests before deployment');
    }
    
    if (failedTests.some(t => t.name === 'Security Tests')) {
      recommendations.push('Address security vulnerabilities immediately');
    }
    
    if (failedTests.some(t => t.name === 'Accessibility Tests')) {
      recommendations.push('Fix accessibility issues to ensure compliance');
    }
    
    if (failedTests.some(t => t.name === 'Performance Tests')) {
      recommendations.push('Optimize performance to meet targets');
    }
    
    if (failedTests.some(t => t.name === 'E2E Tests')) {
      recommendations.push('Fix end-to-end test failures');
    }
    
    if (failedTests.some(t => t.name === 'Production Readiness')) {
      recommendations.push('Complete production readiness checklist');
    }
    
    const skippedTests = this.results.filter(r => r.status === 'skip');
    if (skippedTests.length > 0) {
      recommendations.push('Run skipped tests in appropriate environment');
    }
    
    return recommendations;
  }

  private generateHTMLReport(report: QAReport): void {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive QA Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #6c757d; margin-top: 5px; }
        .results { margin-bottom: 30px; }
        .result { display: flex; align-items: center; padding: 15px; margin-bottom: 10px; border-radius: 8px; }
        .result.pass { background: #d4edda; border-left: 4px solid #28a745; }
        .result.fail { background: #f8d7da; border-left: 4px solid #dc3545; }
        .result.skip { background: #fff3cd; border-left: 4px solid #ffc107; }
        .result-icon { font-size: 1.5em; margin-right: 15px; }
        .result-info { flex: 1; }
        .result-name { font-weight: bold; margin-bottom: 5px; }
        .result-duration { color: #6c757d; font-size: 0.9em; }
        .recommendations { background: #e7f3ff; padding: 20px; border-radius: 8px; }
        .recommendations h3 { color: #0066cc; margin-top: 0; }
        .recommendations ul { margin: 0; padding-left: 20px; }
        .recommendations li { margin-bottom: 8px; }
        .footer { text-align: center; margin-top: 30px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Comprehensive QA Report</h1>
            <p>Generated on ${new Date(report.timestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.summary.total}</div>
                <div class="metric-label">Total Test Suites</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.passed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.failed}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.skipped}</div>
                <div class="metric-label">Skipped</div>
            </div>
            <div class="metric">
                <div class="metric-value">${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${this.formatDuration(report.summary.duration)}</div>
                <div class="metric-label">Total Duration</div>
            </div>
        </div>

        <div class="results">
            <h2>📋 Test Results</h2>
            ${report.results.map(result => `
                <div class="result ${result.status}">
                    <div class="result-icon">${result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️'}</div>
                    <div class="result-info">
                        <div class="result-name">${result.name}</div>
                        <div class="result-duration">${this.formatDuration(result.duration)}</div>
                        ${result.error ? `<div style="color: #dc3545; margin-top: 5px;">${result.error.split('\n')[0]}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        ${report.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>💡 Recommendations</h3>
                <ul>
                    ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        <div class="footer">
            <p>Environment: Node ${report.environment.node} | NPM ${report.environment.npm} | OS ${report.environment.os}</p>
        </div>
    </div>
</body>
</html>
    `;

    const htmlPath = join(process.cwd(), 'comprehensive-qa-report.html');
    writeFileSync(htmlPath, html);
    console.log(`📄 HTML report saved to: ${htmlPath}`);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  private getPackageVersion(packageName: string): string {
    try {
      const output = execSync(`${packageName} --version`, { encoding: 'utf8' });
      return output.trim();
    } catch (error) {
      return 'unknown';
    }
  }
}

// Run comprehensive QA
const runner = new ComprehensiveQARunner();
runner.runAllTests().catch(console.error);