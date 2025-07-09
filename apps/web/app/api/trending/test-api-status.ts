// Test script to verify all trending API endpoints are working
// This can be run manually to check API status

interface TestResult {
  endpoint: string;
  status: 'success' | 'error' | 'timeout';
  responseTime: number;
  data?: any;
  error?: string;
}

const ENDPOINTS = [
  { path: '/api/trending', name: 'Main Trending' },
  { path: '/api/trending/artists', name: 'Trending Artists' },
  { path: '/api/trending/shows', name: 'Trending Shows' },
  { path: '/api/trending/venues', name: 'Trending Venues' },
  { path: '/api/trending/live', name: 'Live Trending' },
  { path: '/api/trending/live?timeframe=1h&type=artist', name: 'Live Artists (1h)' },
  { path: '/api/trending/live?timeframe=6h&type=show', name: 'Live Shows (6h)' },
  { path: '/api/trending/live?timeframe=24h&type=venue', name: 'Live Venues (24h)' },
  { path: '/api/activity/recent', name: 'Recent Activity' },
];

async function testEndpoint(endpoint: { path: string; name: string }): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(endpoint.path, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      return {
        endpoint: endpoint.name,
        status: 'error',
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    
    return {
      endpoint: endpoint.name,
      status: 'success',
      responseTime,
      data: {
        totalItems: data.artists?.length || data.shows?.length || data.venues?.length || data.trending?.length || data.activities?.length || 0,
        fallback: data.fallback || false,
        hasError: !!data.error,
        message: data.message || 'Success',
      },
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if (error.name === 'AbortError') {
      return {
        endpoint: endpoint.name,
        status: 'timeout',
        responseTime,
        error: 'Request timed out after 10 seconds',
      };
    }
    
    return {
      endpoint: endpoint.name,
      status: 'error',
      responseTime,
      error: error.message || 'Unknown error',
    };
  }
}

export async function testAllTrendingEndpoints(): Promise<TestResult[]> {
  console.log('🔍 Testing all trending API endpoints...\n');
  
  const results: TestResult[] = [];
  
  for (const endpoint of ENDPOINTS) {
    console.log(`Testing ${endpoint.name}...`);
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    // Log immediate result
    const status = result.status === 'success' ? '✅' : result.status === 'timeout' ? '⏱️' : '❌';
    console.log(`${status} ${endpoint.name}: ${result.responseTime}ms ${result.error ? `(${result.error})` : ''}`);
    
    if (result.data) {
      console.log(`   - Items: ${result.data.totalItems}, Fallback: ${result.data.fallback}, Error: ${result.data.hasError}`);
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n📊 Summary:');
  const success = results.filter(r => r.status === 'success').length;
  const errors = results.filter(r => r.status === 'error').length;
  const timeouts = results.filter(r => r.status === 'timeout').length;
  
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`⏱️ Timeouts: ${timeouts}`);
  
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  console.log(`⚡ Average response time: ${avgResponseTime.toFixed(0)}ms`);
  
  return results;
}

// Function to test a specific endpoint
export async function testSingleEndpoint(path: string): Promise<TestResult> {
  const endpoint = ENDPOINTS.find(e => e.path === path) || { path, name: path };
  return await testEndpoint(endpoint);
}

// Manual test runner (for development)
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // Only run in development
  (window as any).testTrendingAPI = testAllTrendingEndpoints;
  (window as any).testEndpoint = testSingleEndpoint;
}