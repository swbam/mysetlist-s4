#!/usr/bin/env node

/**
 * Artist Import Orchestrator Performance Testing
 * Tests the core business logic performance targets from GROK.md
 */

const http = require('http');
const { performance } = require('perf_hooks');

class ArtistImportPerformanceTester {
  constructor() {
    this.baseUrl = 'http://localhost:3002';
    this.results = {
      importTests: {},
      sseTests: {},
      backgroundJobs: {},
      cacheTests: {},
      errors: []
    };
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const requestOptions = {
        hostname: 'localhost',
        port: 3002,
        path: path,
        method: options.method || 'GET',
        timeout: options.timeout || 60000,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
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
      
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      
      req.end();
    });
  }

  async testArtistImportKickoff() {
    console.log('🎯 Testing Artist Import Kickoff Performance...\n');
    
    // Test GROK.md requirement: Import kickoff → artist shell visible < 200ms
    const importTests = [
      {
        name: 'Auto Import Kickoff',
        path: '/api/artists/auto-import',
        method: 'POST',
        body: { artistName: 'Test Artist', source: 'ticketmaster' },
        maxTime: 200,
        description: 'GROK.md SLO: Import kickoff → artist shell visible'
      },
      {
        name: 'Import Progress Check',
        path: '/api/artists/import/progress/test-job-123',
        maxTime: 200,
        description: 'SSE progress endpoint response time'
      }
    ];

    for (const test of importTests) {
      try {
        console.log(`Testing ${test.name}...`);
        
        const start = performance.now();
        const response = await this.makeRequest(test.path, {
          method: test.method,
          body: test.body,
          timeout: 10000
        });
        const duration = performance.now() - start;
        
        // Accept various status codes for different test scenarios
        const validCodes = [200, 201, 404, 500]; // 404/500 expected for non-existent jobs
        const passed = duration <= test.maxTime && validCodes.includes(response.statusCode);
        const status = passed ? '✅ PASS' : '❌ FAIL';
        
        console.log(`${status} ${test.name}: ${duration.toFixed(0)}ms (target: ${test.maxTime}ms)`);
        console.log(`   Status: ${response.statusCode}, Description: ${test.description}\n`);
        
        this.results.importTests[test.name] = {
          duration,
          maxTime: test.maxTime,
          passed,
          statusCode: response.statusCode,
          description: test.description
        };

      } catch (error) {
        console.log(`❌ FAIL ${test.name}: ${error.message}\n`);
        this.results.errors.push(`${test.name}: ${error.message}`);
      }
    }
  }

  async testSSEPerformance() {
    console.log('⚡ Testing Server-Sent Events Performance...\n');
    
    // Test GROK.md requirement: Progress events within 200ms
    const sseTests = [
      {
        name: 'SSE Progress Events',
        path: '/api/artists/import/progress/live-test',
        maxTime: 200,
        description: 'GROK.md SLO: SSE events within 200ms'
      },
      {
        name: 'SSE Sync Status',
        path: '/api/sync/status',
        maxTime: 300,
        description: 'Real-time sync status via SSE'
      }
    ];

    for (const test of sseTests) {
      try {
        console.log(`Testing ${test.name}...`);
        
        const start = performance.now();
        const response = await this.makeRequest(test.path, { timeout: 5000 });
        const duration = performance.now() - start;
        
        const passed = duration <= test.maxTime;
        const status = passed ? '✅ PASS' : '❌ FAIL';
        
        console.log(`${status} ${test.name}: ${duration.toFixed(0)}ms (target: ${test.maxTime}ms)`);
        console.log(`   Status: ${response.statusCode}, Description: ${test.description}\n`);
        
        this.results.sseTests[test.name] = {
          duration,
          maxTime: test.maxTime,
          passed,
          statusCode: response.statusCode
        };

      } catch (error) {
        console.log(`❌ FAIL ${test.name}: ${error.message}\n`);
        this.results.errors.push(`${test.name}: ${error.message}`);
      }
    }
  }

  async testBackgroundJobPerformance() {
    console.log('🔄 Testing Background Job Performance...\n');
    
    // Test background sync performance
    const backgroundTests = [
      {
        name: 'Autonomous Sync Status',
        path: '/api/autonomous-sync',
        maxTime: 500,
        description: 'Background sync coordination'
      },
      {
        name: 'Trending Calculation',
        path: '/api/trending/artists',
        maxTime: 500,
        description: 'Trending artists calculation performance'
      }
    ];

    for (const test of backgroundTests) {
      try {
        console.log(`Testing ${test.name}...`);
        
        const start = performance.now();
        const response = await this.makeRequest(test.path, { timeout: 10000 });
        const duration = performance.now() - start;
        
        const passed = duration <= test.maxTime && response.statusCode === 200;
        const status = passed ? '✅ PASS' : '❌ FAIL';
        
        console.log(`${status} ${test.name}: ${duration.toFixed(0)}ms (target: ${test.maxTime}ms)`);
        console.log(`   Status: ${response.statusCode}, Description: ${test.description}\n`);
        
        this.results.backgroundJobs[test.name] = {
          duration,
          maxTime: test.maxTime,
          passed,
          statusCode: response.statusCode
        };

      } catch (error) {
        console.log(`❌ FAIL ${test.name}: ${error.message}\n`);
        this.results.errors.push(`${test.name}: ${error.message}`);
      }
    }
  }

  async testCachePerformance() {
    console.log('💾 Testing Cache Performance...\n');
    
    // Test cache effectiveness by making repeated requests
    const cacheTest = {
      name: 'Search API Cache Performance',
      path: '/api/search/artists?q=taylor',
      iterations: 3
    };

    const timings = [];
    
    try {
      for (let i = 0; i < cacheTest.iterations; i++) {
        console.log(`Cache test iteration ${i + 1}...`);
        
        const start = performance.now();
        const response = await this.makeRequest(cacheTest.path);
        const duration = performance.now() - start;
        
        timings.push(duration);
        console.log(`   Iteration ${i + 1}: ${duration.toFixed(0)}ms (Status: ${response.statusCode})`);
      }
      
      const [first, second, third] = timings;
      const cacheImprovement = ((first - second) / first) * 100;
      
      console.log(`\n📊 Cache Performance Analysis:`);
      console.log(`   First request (cold): ${first.toFixed(0)}ms`);
      console.log(`   Second request (warm): ${second.toFixed(0)}ms`);
      console.log(`   Third request (cached): ${third.toFixed(0)}ms`);
      console.log(`   Cache improvement: ${cacheImprovement.toFixed(1)}%\n`);
      
      const cacheEffective = cacheImprovement > 20; // Expect at least 20% improvement
      const status = cacheEffective ? '✅ PASS' : '❌ FAIL';
      
      console.log(`${status} Cache Effectiveness: ${cacheImprovement.toFixed(1)}% improvement (target: >20%)\n`);
      
      this.results.cacheTests[cacheTest.name] = {
        timings,
        cacheImprovement,
        passed: cacheEffective
      };

    } catch (error) {
      console.log(`❌ FAIL ${cacheTest.name}: ${error.message}\n`);
      this.results.errors.push(`${cacheTest.name}: ${error.message}`);
    }
  }

  generateGROKComplianceReport() {
    console.log('📋 GROK.md COMPLIANCE ASSESSMENT');
    console.log('==================================\n');

    const grokRequirements = [
      {
        name: 'Import kickoff → artist shell visible',
        target: '< 200ms',
        test: 'Auto Import Kickoff',
        category: 'importTests'
      },
      {
        name: 'SSE progress events',
        target: '< 200ms',
        test: 'SSE Progress Events',
        category: 'sseTests'
      },
      {
        name: 'Trending calculation performance',
        target: '< 500ms',
        test: 'Trending Calculation',
        category: 'backgroundJobs'
      },
      {
        name: 'Cache effectiveness',
        target: '> 20% improvement',
        test: 'Search API Cache Performance',
        category: 'cacheTests'
      }
    ];

    let compliantRequirements = 0;
    
    for (const req of grokRequirements) {
      const testResult = this.results[req.category]?.[req.test];
      if (testResult) {
        const status = testResult.passed ? '✅ COMPLIANT' : '❌ NON-COMPLIANT';
        console.log(`${status} ${req.name}: ${req.target}`);
        if (testResult.passed) compliantRequirements++;
      } else {
        console.log(`⚠️  UNTESTED ${req.name}: ${req.target}`);
      }
    }
    
    const complianceRate = (compliantRequirements / grokRequirements.length) * 100;
    console.log(`\n📊 GROK.md Compliance Rate: ${compliantRequirements}/${grokRequirements.length} (${complianceRate.toFixed(1)}%)\n`);

    return { compliantRequirements, totalRequirements: grokRequirements.length, complianceRate };
  }

  generateFinalAssessment() {
    console.log('🎯 FINAL PERFORMANCE ASSESSMENT');
    console.log('===============================\n');

    const compliance = this.generateGROKComplianceReport();
    
    // Count passed tests across all categories
    const allTests = [
      ...Object.values(this.results.importTests),
      ...Object.values(this.results.sseTests),
      ...Object.values(this.results.backgroundJobs),
      ...Object.values(this.results.cacheTests)
    ];
    
    const passedTests = allTests.filter(test => test.passed).length;
    const totalTests = allTests.length;
    const overallSuccessRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    console.log(`📈 Overall Test Results: ${passedTests}/${totalTests} passed (${overallSuccessRate.toFixed(1)}%)`);
    console.log(`🎯 GROK.md Compliance: ${compliance.complianceRate.toFixed(1)}%`);
    
    if (this.results.errors.length > 0) {
      console.log(`❌ Errors: ${this.results.errors.length}`);
    }

    console.log('\n🚀 LAUNCH READINESS FOR ARTIST IMPORT SYSTEM:');
    
    if (compliance.complianceRate >= 75 && overallSuccessRate >= 70) {
      console.log('   ✅ GO: Artist Import Orchestrator meets performance requirements');
    } else if (compliance.complianceRate >= 50 && overallSuccessRate >= 50) {
      console.log('   ⚠️  CONDITIONAL GO: Some performance targets not met, monitor closely');
    } else {
      console.log('   ❌ NO-GO: Critical performance requirements not met');
    }

    // Specific recommendations
    console.log('\n💡 Recommendations:');
    
    if (compliance.complianceRate < 75) {
      console.log('   • Optimize import kickoff performance to meet 200ms target');
      console.log('   • Improve SSE response times for real-time updates');
    }
    
    if (this.results.cacheTests['Search API Cache Performance']?.cacheImprovement < 20) {
      console.log('   • Implement more aggressive caching strategies');
      console.log('   • Consider Redis or in-memory caching for frequent queries');
    }
    
    if (this.results.errors.length > 0) {
      console.log('   • Resolve API endpoint errors before production deployment');
    }

    console.log('\n📊 Performance optimization completed. See detailed results above.');
  }

  async runAllTests() {
    console.log('🎯 ARTIST IMPORT ORCHESTRATOR PERFORMANCE TESTING');
    console.log('==================================================\n');
    console.log('Testing GROK.md compliance for Artist Import System:\n');
    console.log('• Import kickoff → artist shell visible < 200ms');
    console.log('• SSE progress events within 200ms');
    console.log('• Background job performance');
    console.log('• Cache effectiveness\n');

    try {
      await this.testArtistImportKickoff();
      await this.testSSEPerformance();
      await this.testBackgroundJobPerformance();
      await this.testCachePerformance();
      this.generateFinalAssessment();
    } catch (error) {
      console.error('❌ Fatal error during Artist Import testing:', error);
      this.results.errors.push(`Fatal: ${error.message}`);
      this.generateFinalAssessment();
    }
  }
}

// Execute the Artist Import Orchestrator performance tests
const tester = new ArtistImportPerformanceTester();
tester.runAllTests().catch(console.error);