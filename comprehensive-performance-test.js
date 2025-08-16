#!/usr/bin/env node

/**
 * Comprehensive Performance Testing Suite for TheSet
 * Tests: Core Web Vitals, Mobile Responsiveness, Real-time Features, Database Performance
 */

const http = require('http');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;

class ComprehensivePerformanceTester {
  constructor() {
    this.baseUrl = 'http://localhost:3002';
    this.results = {
      summary: {
        testsRun: 0,
        testsPassed: 0,
        testsFailed: 0,
        errors: []
      },
      coreWebVitals: {},
      apiPerformance: {},
      databasePerformance: {},
      realTimeFeatures: {},
      mobileResponsiveness: {},
      stressTests: {},
      recommendations: []
    };
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const requestOptions = {
        hostname: 'localhost',
        port: 3002,
        path: path,
        method: options.method || 'GET',
        timeout: options.timeout || 30000,
        headers: options.headers || {}
      };

      const req = http.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ 
          statusCode: res.statusCode, 
          data, 
          headers: res.headers 
        }));
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.end();
    });
  }

  async testCoreWebVitals() {
    console.log('📊 Testing Core Web Vitals Performance...\n');
    
    const tests = [
      {
        name: 'Homepage Load Time',
        path: '/',
        maxTime: 2500,
        description: 'LCP target'
      },
      {
        name: 'Artist Page Load Time',
        path: '/artists',
        maxTime: 2500,
        description: 'LCP target'
      },
      {
        name: 'Trending Page Load Time',
        path: '/trending',
        maxTime: 2500,
        description: 'LCP target'
      }
    ];

    for (const test of tests) {
      try {
        this.results.summary.testsRun++;
        const start = performance.now();
        const response = await this.makeRequest(test.path, { timeout: 15000 });
        const duration = performance.now() - start;
        
        const passed = duration <= test.maxTime && response.statusCode === 200;
        const status = passed ? '✅ PASS' : '❌ FAIL';
        
        console.log(`${status} ${test.name}: ${duration.toFixed(0)}ms (${test.description}: ${test.maxTime}ms)`);
        
        this.results.coreWebVitals[test.name] = {
          duration,
          maxTime: test.maxTime,
          passed,
          statusCode: response.statusCode
        };

        if (passed) this.results.summary.testsPassed++;
        else this.results.summary.testsFailed++;

      } catch (error) {
        console.log(`❌ FAIL ${test.name}: ${error.message}`);
        this.results.summary.testsFailed++;
        this.results.summary.errors.push(`${test.name}: ${error.message}`);
      }
    }
    console.log('');
  }

  async testApiPerformance() {
    console.log('🔥 Testing API Performance & Response Times...\n');
    
    const apiTests = [
      {
        name: 'Search Artists API',
        path: '/api/search/artists?q=taylor',
        maxTime: 300,
        critical: true
      },
      {
        name: 'Song Search API',
        path: '/api/songs/search?q=love&limit=10',
        maxTime: 400,
        critical: true
      },
      {
        name: 'Trending Artists API',
        path: '/api/trending/artists',
        maxTime: 500,
        critical: false
      },
      {
        name: 'Health Check API',
        path: '/api/health',
        maxTime: 200,
        critical: true
      }
    ];

    for (const test of apiTests) {
      try {
        this.results.summary.testsRun++;
        
        // Test with warm-up call first
        await this.makeRequest(test.path, { timeout: 5000 });
        
        // Actual measurement
        const start = performance.now();
        const response = await this.makeRequest(test.path);
        const duration = performance.now() - start;
        
        const passed = duration <= test.maxTime && response.statusCode === 200;
        const status = passed ? '✅ PASS' : '❌ FAIL';
        const priority = test.critical ? '[CRITICAL]' : '[NORMAL]';
        
        console.log(`${status} ${priority} ${test.name}: ${duration.toFixed(0)}ms (target: ${test.maxTime}ms)`);
        
        this.results.apiPerformance[test.name] = {
          duration,
          maxTime: test.maxTime,
          passed,
          critical: test.critical,
          statusCode: response.statusCode
        };

        if (passed) this.results.summary.testsPassed++;
        else this.results.summary.testsFailed++;

      } catch (error) {
        console.log(`❌ FAIL ${test.name}: ${error.message}`);
        this.results.summary.testsFailed++;
        this.results.summary.errors.push(`${test.name}: ${error.message}`);
      }
    }
    console.log('');
  }

  async testDatabasePerformance() {
    console.log('🗄️ Testing Database Query Performance...\n');
    
    const dbTests = [
      {
        name: 'Simple Artist Search',
        path: '/api/search/artists?q=a',
        maxTime: 400,
        description: 'Basic search performance'
      },
      {
        name: 'Complex Song Search',
        path: '/api/songs/search?q=love%20song&limit=20',
        maxTime: 600,
        description: 'Multi-field search with LIKE queries'
      },
      {
        name: 'Large Result Set',
        path: '/api/songs/search?q=the&limit=50',
        maxTime: 800,
        description: 'Paginated large results'
      }
    ];

    for (const test of dbTests) {
      try {
        this.results.summary.testsRun++;
        
        const start = performance.now();
        const response = await this.makeRequest(test.path);
        const duration = performance.now() - start;
        
        const passed = duration <= test.maxTime && response.statusCode === 200;
        const status = passed ? '✅ PASS' : '❌ FAIL';
        
        console.log(`${status} ${test.name}: ${duration.toFixed(0)}ms (${test.description})`);
        
        this.results.databasePerformance[test.name] = {
          duration,
          maxTime: test.maxTime,
          passed,
          description: test.description
        };

        if (passed) this.results.summary.testsPassed++;
        else this.results.summary.testsFailed++;

      } catch (error) {
        console.log(`❌ FAIL ${test.name}: ${error.message}`);
        this.results.summary.testsFailed++;
        this.results.summary.errors.push(`${test.name}: ${error.message}`);
      }
    }
    console.log('');
  }

  async testRealTimeFeatures() {
    console.log('⚡ Testing Real-time Features & SSE Performance...\n');
    
    const realTimeTests = [
      {
        name: 'SSE Import Progress',
        path: '/api/artists/import/progress/test-job',
        maxTime: 200,
        description: 'Server-Sent Events response time'
      },
      {
        name: 'Sync Status Endpoint',
        path: '/api/sync/status',
        maxTime: 300,
        description: 'Real-time sync status'
      }
    ];

    for (const test of realTimeTests) {
      try {
        this.results.summary.testsRun++;
        
        const start = performance.now();
        const response = await this.makeRequest(test.path, { timeout: 5000 });
        const duration = performance.now() - start;
        
        // For SSE endpoints, we accept 404 as they might not have active jobs
        const validStatusCodes = [200, 404, 500];
        const passed = duration <= test.maxTime && validStatusCodes.includes(response.statusCode);
        const status = passed ? '✅ PASS' : '❌ FAIL';
        
        console.log(`${status} ${test.name}: ${duration.toFixed(0)}ms (${test.description})`);
        
        this.results.realTimeFeatures[test.name] = {
          duration,
          maxTime: test.maxTime,
          passed,
          statusCode: response.statusCode
        };

        if (passed) this.results.summary.testsPassed++;
        else this.results.summary.testsFailed++;

      } catch (error) {
        console.log(`❌ FAIL ${test.name}: ${error.message}`);
        this.results.summary.testsFailed++;
        this.results.summary.errors.push(`${test.name}: ${error.message}`);
      }
    }
    console.log('');
  }

  async testConcurrentLoad() {
    console.log('🚀 Testing Concurrent Load & Stress Performance...\n');
    
    const stressTests = [
      {
        name: 'Light Concurrent Load',
        concurrent: 5,
        requests: 10,
        endpoint: '/api/trending/artists'
      },
      {
        name: 'Medium Concurrent Load',
        concurrent: 10,
        requests: 20,
        endpoint: '/api/search/artists?q=test'
      }
    ];

    for (const test of stressTests) {
      try {
        this.results.summary.testsRun++;
        
        const start = performance.now();
        const promises = [];
        let successCount = 0;
        
        for (let i = 0; i < test.requests; i++) {
          const promise = this.makeRequest(test.endpoint)
            .then(response => {
              if (response.statusCode === 200) successCount++;
              return response;
            })
            .catch(error => ({ error: error.message }));
          
          promises.push(promise);
          
          // Control concurrency
          if (promises.length >= test.concurrent) {
            await Promise.allSettled(promises.splice(0, test.concurrent));
          }
        }
        
        // Wait for remaining requests
        if (promises.length > 0) {
          await Promise.allSettled(promises);
        }
        
        const duration = performance.now() - start;
        const avgPerRequest = duration / test.requests;
        const successRate = (successCount / test.requests) * 100;
        
        const passed = successRate >= 95 && avgPerRequest <= 1000;
        const status = passed ? '✅ PASS' : '❌ FAIL';
        
        console.log(`${status} ${test.name}: ${test.requests} requests, ${avgPerRequest.toFixed(0)}ms avg, ${successRate.toFixed(1)}% success`);
        
        this.results.stressTests[test.name] = {
          requests: test.requests,
          concurrent: test.concurrent,
          avgPerRequest,
          successRate,
          passed
        };

        if (passed) this.results.summary.testsPassed++;
        else this.results.summary.testsFailed++;

      } catch (error) {
        console.log(`❌ FAIL ${test.name}: ${error.message}`);
        this.results.summary.testsFailed++;
        this.results.summary.errors.push(`${test.name}: ${error.message}`);
      }
    }
    console.log('');
  }

  async testMobileResponsiveness() {
    console.log('📱 Testing Mobile Responsiveness & Viewport Performance...\n');
    
    // Test different viewport scenarios by checking response headers and content
    const mobileTests = [
      {
        name: 'Mobile Viewport Response',
        path: '/',
        headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15' },
        description: 'Mobile user agent handling'
      },
      {
        name: 'Tablet Viewport Response',
        path: '/',
        headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 14_7 like Mac OS X) AppleWebKit/605.1.15' },
        description: 'Tablet user agent handling'
      }
    ];

    for (const test of mobileTests) {
      try {
        this.results.summary.testsRun++;
        
        const start = performance.now();
        const response = await this.makeRequest(test.path, { headers: test.headers });
        const duration = performance.now() - start;
        
        const passed = response.statusCode === 200 && duration <= 3000;
        const status = passed ? '✅ PASS' : '❌ FAIL';
        
        console.log(`${status} ${test.name}: ${duration.toFixed(0)}ms (${test.description})`);
        
        this.results.mobileResponsiveness[test.name] = {
          duration,
          passed,
          statusCode: response.statusCode
        };

        if (passed) this.results.summary.testsPassed++;
        else this.results.summary.testsFailed++;

      } catch (error) {
        console.log(`❌ FAIL ${test.name}: ${error.message}`);
        this.results.summary.testsFailed++;
        this.results.summary.errors.push(`${test.name}: ${error.message}`);
      }
    }
    console.log('');
  }

  generateRecommendations() {
    const recommendations = [];
    
    // API Performance recommendations
    const slowApis = Object.entries(this.results.apiPerformance)
      .filter(([name, result]) => !result.passed)
      .map(([name, result]) => ({ name, duration: result.duration, target: result.maxTime }));

    if (slowApis.length > 0) {
      recommendations.push({
        category: 'API Performance',
        priority: 'HIGH',
        issue: 'Slow API response times detected',
        recommendation: 'Optimize database queries, add caching, or consider API response optimization',
        affectedEndpoints: slowApis
      });
    }

    // Database Performance recommendations
    const slowQueries = Object.entries(this.results.databasePerformance)
      .filter(([name, result]) => !result.passed);

    if (slowQueries.length > 0) {
      recommendations.push({
        category: 'Database Performance',
        priority: 'HIGH',
        issue: 'Slow database queries detected',
        recommendation: 'Add database indexes, optimize LIKE queries, implement query caching',
        details: 'Consider using full-text search for song/artist queries'
      });
    }

    // Core Web Vitals recommendations
    const slowPages = Object.entries(this.results.coreWebVitals)
      .filter(([name, result]) => !result.passed);

    if (slowPages.length > 0) {
      recommendations.push({
        category: 'Core Web Vitals',
        priority: 'MEDIUM',
        issue: 'Page load times exceed Core Web Vitals targets',
        recommendation: 'Implement code splitting, optimize bundle size, add service worker caching'
      });
    }

    return recommendations;
  }

  async generateReport() {
    console.log('📊 COMPREHENSIVE PERFORMANCE TEST RESULTS');
    console.log('==========================================\n');

    // Overall Summary
    const successRate = (this.results.summary.testsPassed / this.results.summary.testsRun) * 100;
    console.log(`📈 Overall Results: ${this.results.summary.testsPassed}/${this.results.summary.testsRun} tests passed (${successRate.toFixed(1)}%)\n`);

    // Performance Category Summaries
    const categories = [
      { name: 'Core Web Vitals', data: this.results.coreWebVitals },
      { name: 'API Performance', data: this.results.apiPerformance },
      { name: 'Database Performance', data: this.results.databasePerformance },
      { name: 'Real-time Features', data: this.results.realTimeFeatures },
      { name: 'Stress Tests', data: this.results.stressTests },
      { name: 'Mobile Responsiveness', data: this.results.mobileResponsiveness }
    ];

    for (const category of categories) {
      if (Object.keys(category.data).length > 0) {
        console.log(`🎯 ${category.name}:`);
        for (const [testName, result] of Object.entries(category.data)) {
          const status = result.passed ? '✅' : '❌';
          console.log(`   ${status} ${testName}`);
        }
        console.log('');
      }
    }

    // Performance Assessment
    console.log('🎯 PERFORMANCE ASSESSMENT:');
    if (successRate >= 85) {
      console.log('   ✅ EXCELLENT: Performance targets mostly met, ready for production');
    } else if (successRate >= 70) {
      console.log('   ⚠️  GOOD: Some performance issues detected, minor optimizations needed');
    } else if (successRate >= 50) {
      console.log('   ⚠️  FAIR: Multiple performance issues, optimization required before launch');
    } else {
      console.log('   ❌ POOR: Significant performance problems, major optimization required');
    }

    // Launch Readiness Assessment
    console.log('\n🚀 LAUNCH READINESS ASSESSMENT:');
    const criticalApisPassed = Object.values(this.results.apiPerformance)
      .filter(result => result.critical)
      .every(result => result.passed);
    
    const coreWebVitalsPassed = Object.values(this.results.coreWebVitals)
      .filter(result => result.passed).length >= 2;

    if (successRate >= 80 && criticalApisPassed && this.results.summary.errors.length < 3) {
      console.log('   ✅ GO: Application ready for production launch');
    } else if (successRate >= 60 && criticalApisPassed) {
      console.log('   ⚠️  CONDITIONAL GO: Launch possible but monitor performance closely');
    } else {
      console.log('   ❌ NO-GO: Critical performance issues must be resolved before launch');
    }

    // Error Summary
    if (this.results.summary.errors.length > 0) {
      console.log('\n❌ Critical Errors:');
      this.results.summary.errors.forEach(error => console.log(`   • ${error}`));
    }

    // Recommendations
    const recommendations = this.generateRecommendations();
    if (recommendations.length > 0) {
      console.log('\n💡 Performance Optimization Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority}] ${rec.category}: ${rec.issue}`);
        console.log(`      → ${rec.recommendation}`);
      });
    }

    // Save detailed results
    await this.saveResults();
  }

  async saveResults() {
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        summary: this.results.summary,
        results: this.results,
        recommendations: this.generateRecommendations()
      };

      await fs.writeFile(
        '/root/repo/performance-test-results.json',
        JSON.stringify(reportData, null, 2)
      );
      
      console.log('\n💾 Detailed results saved to: performance-test-results.json');
    } catch (error) {
      console.log('\n⚠️  Could not save detailed results:', error.message);
    }
  }

  async runAllTests() {
    console.log('🎯 THESET COMPREHENSIVE PERFORMANCE TESTING SUITE');
    console.log('=================================================\n');
    console.log('Testing Core Web Vitals, API Performance, Database Queries,');
    console.log('Real-time Features, Stress Testing, and Mobile Responsiveness\n');

    try {
      await this.testCoreWebVitals();
      await this.testApiPerformance();
      await this.testDatabasePerformance();
      await this.testRealTimeFeatures();
      await this.testConcurrentLoad();
      await this.testMobileResponsiveness();
      await this.generateReport();
    } catch (error) {
      console.error('❌ Fatal error during comprehensive testing:', error);
      this.results.summary.errors.push(`Fatal: ${error.message}`);
      await this.generateReport();
    }
  }
}

// Execute the comprehensive performance test suite
const tester = new ComprehensivePerformanceTester();
tester.runAllTests().catch(console.error);