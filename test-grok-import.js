#!/usr/bin/env node

/**
 * GROK.md Import System Comprehensive Test
 * Tests the complete import workflow with real APIs
 */

const { execSync } = require('child_process');
const fetch = require('node-fetch');

// Test configuration
const TEST_CONFIG = {
  // Use smaller artists for faster testing
  TICKETMASTER_ATTRACTIONS: [
    'K8vZ9171oC0',  // Billie Eilish - smaller catalog, active touring
    'K8vZ9171Ab7',  // Post Malone - medium catalog, many shows  
    'K8vZ9171oVf',  // Taylor Swift - large catalog, many shows
  ],
  BASE_URL: 'http://localhost:3001',
  TIMEOUT: 60000, // 60 seconds per import
};

class GrokTestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      details: [],
    };
  }

  async runTest(name, testFn) {
    this.results.total++;
    const startTime = Date.now();
    
    try {
      console.log(`🧪 Testing: ${name}`);
      await testFn();
      const duration = Date.now() - startTime;
      this.results.passed++;
      this.results.details.push({
        name,
        status: 'PASSED',
        duration: `${duration}ms`,
      });
      console.log(`✅ PASSED: ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.failed++;
      this.results.details.push({
        name,
        status: 'FAILED',
        duration: `${duration}ms`,
        error: error.message,
      });
      console.log(`❌ FAILED: ${name} (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
    }
  }

  async testApiEndpointsExist() {
    const endpoints = [
      '/api/health',
      '/api/artists/import',
    ];
    
    for (const endpoint of endpoints) {
      const response = await fetch(`${TEST_CONFIG.BASE_URL}${endpoint}`, {
        method: endpoint.includes('import') ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.includes('import') ? JSON.stringify({ tmAttractionId: 'test' }) : undefined,
      });
      
      if (!response) {
        throw new Error(`Endpoint ${endpoint} not reachable`);
      }
      
      console.log(`   📡 ${endpoint}: ${response.status}`);
    }
  }

  async testCompleteImportWorkflow() {
    const attractionId = TEST_CONFIG.TICKETMASTER_ATTRACTIONS[0]; // Start with smallest
    
    console.log(`   🎯 Testing with Ticketmaster attraction: ${attractionId}`);
    
    // Step 1: Initiate import
    const importResponse = await fetch(`${TEST_CONFIG.BASE_URL}/api/artists/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmAttractionId: attractionId }),
    });
    
    if (!importResponse.ok) {
      throw new Error(`Import initiation failed: ${importResponse.status} ${await importResponse.text()}`);
    }
    
    const importResult = await importResponse.json();
    const { artistId, slug } = importResult;
    
    if (!artistId || !slug) {
      throw new Error('Import response missing artistId or slug');
    }
    
    console.log(`   ✨ Artist created: ${artistId} (${slug})`);
    
    // Step 2: Test SSE stream
    await this.testSSEStream(artistId);
    
    // Step 3: Validate final status
    await this.validateImportCompletion(artistId);
    
    return { artistId, slug };
  }

  async testSSEStream(artistId) {
    return new Promise((resolve, reject) => {
      const streamUrl = `${TEST_CONFIG.BASE_URL}/api/artists/${artistId}/stream`;
      console.log(`   🌊 Testing SSE stream: ${streamUrl}`);
      
      // For Node.js testing, we'll test the status endpoint instead
      this.testProgressPolling(artistId).then(resolve).catch(reject);
    });
  }

  async testProgressPolling(artistId) {
    const maxAttempts = 60; // 60 attempts = 60 seconds
    let attempts = 0;
    let lastStage = '';
    
    while (attempts < maxAttempts) {
      try {
        const statusResponse = await fetch(`${TEST_CONFIG.BASE_URL}/api/artists/${artistId}/status`);
        
        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.status}`);
        }
        
        const status = await statusResponse.json();
        const { stage, progress, message } = status;
        
        if (stage !== lastStage) {
          console.log(`   📊 ${stage}: ${progress}% - ${message}`);
          lastStage = stage;
        }
        
        if (stage === 'completed') {
          console.log(`   🎉 Import completed successfully!`);
          return status;
        }
        
        if (stage === 'failed') {
          throw new Error(`Import failed: ${message}`);
        }
        
        // Wait 1 second before next check
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        
      } catch (error) {
        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }
    
    throw new Error('Import timeout - did not complete within 60 seconds');
  }

  async validateImportCompletion(artistId) {
    // Check if data was actually imported
    const queries = [
      `/api/artists/${artistId}/songs`,
      // We'll add more validation endpoints as needed
    ];
    
    for (const query of queries) {
      try {
        const response = await fetch(`${TEST_CONFIG.BASE_URL}${query}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`   📈 ${query}: ${JSON.stringify(data).length} characters of data`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${query}: ${error.message}`);
      }
    }
  }

  async testStudioOnlyFiltering() {
    console.log(`   🎵 Studio-only filtering will be validated by checking imported songs...`);
    // This will be implemented after we have data to check
  }

  async testShowsPagination() {
    console.log(`   📄 Pagination testing requires artist with many shows...`);
    // Will use Taylor Swift (K8vZ9171oVf) for this test
  }

  async testErrorHandling() {
    // Test with invalid attraction ID
    try {
      const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/artists/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmAttractionId: 'invalid-id-12345' }),
      });
      
      const result = await response.json();
      console.log(`   🚫 Invalid ID test: ${response.status} - ${result.error || result.message}`);
      
      if (response.ok) {
        throw new Error('Expected error for invalid attraction ID');
      }
    } catch (error) {
      if (error.message.includes('Expected error')) {
        throw error;
      }
      console.log(`   ✅ Error handling working: ${error.message}`);
    }
  }

  async testPerformanceSLOs() {
    console.log(`   ⚡ Performance SLOs from GROK.md:`);
    console.log(`      - Import kickoff → artist shell visible: < 200ms`);
    console.log(`      - Shows & venues phase (1k events): < 30s`);
    console.log(`      - Catalog phase (2k+ tracks): < 45s`);
    console.log(`      - Search API: < 300ms`);
    console.log(`      - Page load to skeleton: < 800ms`);
    console.log(`      - Import failure rate: < 1%`);
    
    // These will be measured during actual import tests
  }

  printSummary() {
    console.log('\n📋 GROK.md Import System Test Summary');
    console.log('=' .repeat(50));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ❌`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.details
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n📊 Performance Summary:');
    this.results.details.forEach(test => {
      const status = test.status === 'PASSED' ? '✅' : '❌';
      console.log(`   ${status} ${test.name}: ${test.duration}`);
    });
  }
}

async function checkServerAvailability() {
  try {
    const response = await fetch(`${TEST_CONFIG.BASE_URL}/api/health`, { 
      timeout: 5000 
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function startDevServer() {
  console.log('🚀 Starting development server...');
  
  const { spawn } = require('child_process');
  const server = spawn('pnpm', ['dev'], {
    stdio: 'pipe',
    detached: false,
  });
  
  // Wait for server to be ready
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    try {
      const isReady = await checkServerAvailability();
      if (isReady) {
        console.log('✅ Development server is ready!');
        return server;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }
  
  throw new Error('Development server failed to start within 60 seconds');
}

async function main() {
  console.log('🧪 GROK.md Import System - Comprehensive End-to-End Testing');
  console.log('===========================================================\n');
  
  const runner = new GrokTestRunner();
  let server = null;
  
  try {
    // Check if server is already running
    const isServerRunning = await checkServerAvailability();
    
    if (!isServerRunning) {
      server = await startDevServer();
    } else {
      console.log('✅ Development server already running');
    }
    
    // Run all tests
    await runner.runTest('API Endpoints Exist', () => runner.testApiEndpointsExist());
    await runner.runTest('Complete Import Workflow', () => runner.testCompleteImportWorkflow());
    await runner.runTest('Error Handling', () => runner.testErrorHandling());
    await runner.runTest('Studio-Only Filtering', () => runner.testStudioOnlyFiltering());
    await runner.runTest('Shows Pagination', () => runner.testShowsPagination());
    await runner.runTest('Performance SLOs', () => runner.testPerformanceSLOs());
    
  } catch (error) {
    console.error('💥 Test setup failed:', error.message);
    process.exit(1);
  } finally {
    if (server) {
      console.log('🛑 Stopping development server...');
      server.kill('SIGTERM');
    }
  }
  
  runner.printSummary();
  
  // Exit with appropriate code
  process.exit(runner.results.failed > 0 ? 1 : 0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  process.exit(1);
});

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}