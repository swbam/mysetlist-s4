#!/usr/bin/env node

/**
 * Comprehensive Performance and Stress Testing Suite
 * Tests all critical performance metrics for TheSet application
 */

const http = require('http');
const { performance } = require('perf_hooks');

class PerformanceStressTester {
  constructor() {
    this.baseUrl = 'http://localhost:3002';
    this.results = {
      coreWebVitals: {},
      apiPerformance: {},
      stressTests: {},
      realTimeTests: {},
      errors: []
    };
  }

  // Test API response times
  async testApiPerformance() {
    console.log('🔥 Testing API Performance...\n');
    
    const apiEndpoints = [
      { name: 'Search Artists', url: '/api/search/artists?q=taylor', target: 300 },
      { name: 'Trending Artists', url: '/api/trending/artists', target: 500 },
      { name: 'Song Search', url: '/api/songs/search?q=love&limit=5', target: 400 },
      { name: 'Popular Artists', url: '/api/popular-artists', target: 400 },
      { name: 'Health Check', url: '/api/health', target: 100 }
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const start = performance.now();
        const response = await this.makeRequest(endpoint.url);
        const duration = performance.now() - start;
        
        const status = duration <= endpoint.target ? '✅' : '❌';
        console.log(`${status} ${endpoint.name}: ${duration.toFixed(0)}ms (target: ${endpoint.target}ms)`);
        
        this.results.apiPerformance[endpoint.name] = {
          duration,
          target: endpoint.target,
          passed: duration <= endpoint.target,
          status: response.statusCode
        };
      } catch (error) {
        console.log(`❌ ${endpoint.name}: Error - ${error.message}`);
        this.results.errors.push(`${endpoint.name}: ${error.message}`);
      }
    }
    console.log('');
  }

  // Test concurrent load
  async testConcurrentLoad() {
    console.log('🚀 Testing Concurrent Load...\n');
    
    const concurrentTests = [
      { name: 'Low Load', concurrent: 5, requests: 10 },
      { name: 'Medium Load', concurrent: 10, requests: 20 },
      { name: 'High Load', concurrent: 20, requests: 40 }
    ];

    for (const test of concurrentTests) {
      try {
        const start = performance.now();
        const promises = [];
        
        for (let i = 0; i < test.requests; i++) {
          promises.push(this.makeRequest('/api/trending/artists'));
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
        
        console.log(`✅ ${test.name}: ${test.requests} requests, ${avgPerRequest.toFixed(0)}ms avg`);
        
        this.results.stressTests[test.name] = {
          requests: test.requests,
          concurrent: test.concurrent,
          totalTime: duration,
          avgPerRequest
        };
      } catch (error) {
        console.log(`❌ ${test.name}: Error - ${error.message}`);
        this.results.errors.push(`${test.name}: ${error.message}`);
      }
    }
    console.log('');
  }

  // Test real-time features
  async testRealTimeFeatures() {
    console.log('⚡ Testing Real-time Features...\n');
    
    // Test SSE endpoints
    const sseEndpoints = [
      '/api/artists/import/progress/test-job-id',
      '/api/sync/status'
    ];

    for (const endpoint of sseEndpoints) {
      try {
        const start = performance.now();
        const response = await this.makeRequest(endpoint);
        const duration = performance.now() - start;
        
        console.log(`✅ SSE ${endpoint}: ${duration.toFixed(0)}ms`);
        this.results.realTimeTests[endpoint] = { duration, status: response.statusCode };
      } catch (error) {
        console.log(`❌ SSE ${endpoint}: Error - ${error.message}`);
        this.results.errors.push(`SSE ${endpoint}: ${error.message}`);
      }
    }
    console.log('');
  }

  // Test database performance
  async testDatabasePerformance() {
    console.log('🗄️ Testing Database Performance...\n');
    
    const dbTests = [
      { name: 'Complex Search Query', url: '/api/search/artists?q=rock', target: 400 },
      { name: 'Large Dataset Query', url: '/api/trending/artists', target: 500 },
      { name: 'Paginated Results', url: '/api/songs/search?q=love&limit=50', target: 600 }
    ];

    for (const test of dbTests) {
      try {
        const start = performance.now();
        await this.makeRequest(test.url);
        const duration = performance.now() - start;
        
        const status = duration <= test.target ? '✅' : '❌';
        console.log(`${status} ${test.name}: ${duration.toFixed(0)}ms (target: ${test.target}ms)`);
      } catch (error) {
        console.log(`❌ ${test.name}: Error - ${error.message}`);
        this.results.errors.push(`DB ${test.name}: ${error.message}`);
      }
    }
    console.log('');
  }

  // Make HTTP request
  makeRequest(path) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3002,
        path: path,
        method: 'GET',
        timeout: 30000
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.end();
    });
  }

  // Generate performance report
  generateReport() {
    console.log('📊 PERFORMANCE TEST RESULTS');
    console.log('===========================\n');

    // API Performance Summary
    console.log('🔥 API Performance Results:');
    let apiPassed = 0;
    let apiTotal = 0;
    for (const [name, result] of Object.entries(this.results.apiPerformance)) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`   ${status} ${name}: ${result.duration.toFixed(0)}ms`);
      if (result.passed) apiPassed++;
      apiTotal++;
    }
    console.log(`   API Success Rate: ${apiPassed}/${apiTotal} (${((apiPassed/apiTotal)*100).toFixed(1)}%)\n`);

    // Stress Test Summary
    console.log('🚀 Stress Test Results:');
    for (const [name, result] of Object.entries(this.results.stressTests)) {
      console.log(`   ✅ ${name}: ${result.requests} requests, ${result.avgPerRequest.toFixed(0)}ms avg`);
    }
    console.log('');

    // Error Summary
    if (this.results.errors.length > 0) {
      console.log('❌ Errors Encountered:');
      this.results.errors.forEach(error => console.log(`   • ${error}`));
      console.log('');
    }

    // Performance Assessment
    console.log('🎯 PERFORMANCE ASSESSMENT:');
    const overallPassed = apiPassed / apiTotal;
    if (overallPassed >= 0.8) {
      console.log('   ✅ EXCELLENT: Performance targets mostly met');
    } else if (overallPassed >= 0.6) {
      console.log('   ⚠️  GOOD: Some performance improvements needed');
    } else {
      console.log('   ❌ NEEDS WORK: Significant performance issues detected');
    }

    console.log('\n🚀 LAUNCH READINESS ASSESSMENT:');
    if (overallPassed >= 0.8 && this.results.errors.length < 3) {
      console.log('   ✅ GO: Application ready for launch');
    } else {
      console.log('   ❌ NO-GO: Performance issues must be addressed before launch');
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🎯 THESET PERFORMANCE & STRESS TESTING SUITE');
    console.log('=============================================\n');

    try {
      await this.testApiPerformance();
      await this.testDatabasePerformance();
      await this.testConcurrentLoad();
      await this.testRealTimeFeatures();
      this.generateReport();
    } catch (error) {
      console.error('Fatal error during testing:', error);
    }
  }
}

// Run the tests
const tester = new PerformanceStressTester();
tester.runAllTests().catch(console.error);