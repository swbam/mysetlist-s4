/**
 * Test utility for the calculate-trending endpoint
 * Run with: npx tsx apps/web/app/api/cron/calculate-trending/test-endpoint.ts
 */

const CRON_SECRET = process.env.CRON_SECRET || 'test-secret';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  response?: any;
  error?: string;
  duration?: number;
}

async function testEndpoint(
  name: string, 
  path: string, 
  expectedStatus: number = 200
): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    
    const duration = Date.now() - start;
    const data = await response.json();
    
    if (response.status !== expectedStatus) {
      return {
        name,
        status: 'FAIL',
        error: `Expected status ${expectedStatus}, got ${response.status}`,
        response: data,
        duration,
      };
    }
    
    return {
      name,
      status: 'PASS',
      response: data,
      duration,
    };
  } catch (error) {
    return {
      name,
      status: 'FAIL',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

async function runTests() {
  console.log('🚀 Testing calculate-trending endpoint...\n');
  
  const tests: TestResult[] = [];
  
  // Test 1: Basic functionality
  tests.push(await testEndpoint(
    'Basic trending calculation (daily)', 
    '/api/cron/calculate-trending?mode=daily'
  ));
  
  // Test 2: Hourly mode
  tests.push(await testEndpoint(
    'Hourly trending calculation', 
    '/api/cron/calculate-trending?mode=hourly'
  ));
  
  // Test 3: Artists only
  tests.push(await testEndpoint(
    'Artists only calculation', 
    '/api/cron/calculate-trending?type=artists'
  ));
  
  // Test 4: Shows only
  tests.push(await testEndpoint(
    'Shows only calculation', 
    '/api/cron/calculate-trending?type=shows'
  ));
  
  // Test 5: Unauthorized access
  const unauthorizedResult = await testUnauthorized();
  tests.push(unauthorizedResult);
  
  // Print results
  console.log('📊 Test Results:\n');
  let passed = 0;
  let failed = 0;
  
  tests.forEach(test => {
    const statusIcon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⏭️ ';
    console.log(`${statusIcon} ${test.name}`);
    
    if (test.duration) {
      console.log(`   Duration: ${test.duration}ms`);
    }
    
    if (test.status === 'PASS') {
      passed++;
      if (test.response?.results) {
        const r = test.response.results;
        console.log(`   Artists updated: ${r.artists?.updated || 0}`);
        console.log(`   Shows updated: ${r.shows?.updated || 0}`);
        if (r.trending) {
          console.log(`   Top trending artist: ${r.trending.topArtist}`);
          console.log(`   Top trending show: ${r.trending.topShow}`);
        }
      }
    } else {
      failed++;
      console.log(`   Error: ${test.error}`);
      if (test.response) {
        console.log(`   Response: ${JSON.stringify(test.response, null, 2)}`);
      }
    }
    console.log('');
  });
  
  console.log(`\n📈 Summary: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the output above.');
  }
}

async function testUnauthorized(): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/cron/calculate-trending`, {
      headers: {
        'Authorization': 'Bearer invalid-secret',
        'Content-Type': 'application/json',
      },
    });
    
    const duration = Date.now() - start;
    const data = await response.json();
    
    if (response.status !== 401) {
      return {
        name: 'Unauthorized access protection',
        status: 'FAIL',
        error: `Expected 401 Unauthorized, got ${response.status}`,
        response: data,
        duration,
      };
    }
    
    return {
      name: 'Unauthorized access protection',
      status: 'PASS',
      response: data,
      duration,
    };
  } catch (error) {
    return {
      name: 'Unauthorized access protection',
      status: 'FAIL',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

// Performance test
async function performanceTest() {
  console.log('\n🏎️  Running performance test (daily mode)...');
  
  const iterations = 3;
  const durations: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const result = await testEndpoint(
      `Performance test ${i + 1}`, 
      '/api/cron/calculate-trending?mode=daily'
    );
    
    if (result.duration) {
      durations.push(result.duration);
    }
    
    console.log(`Iteration ${i + 1}: ${result.duration}ms - ${result.status}`);
  }
  
  if (durations.length > 0) {
    const avg = durations.reduce((a, b) => a + b) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    
    console.log(`\n📊 Performance Summary:`);
    console.log(`   Average: ${avg.toFixed(2)}ms`);
    console.log(`   Min: ${min}ms`);
    console.log(`   Max: ${max}ms`);
    
    if (avg < 5000) {
      console.log('✅ Performance is good (< 5 seconds)');
    } else if (avg < 15000) {
      console.log('⚠️  Performance is acceptable (< 15 seconds)');
    } else {
      console.log('❌ Performance needs optimization (> 15 seconds)');
    }
  }
}

// Run tests
if (require.main === module) {
  runTests()
    .then(() => performanceTest())
    .then(() => {
      console.log('\n✨ Testing complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}

export { testEndpoint, runTests, performanceTest };