#!/usr/bin/env node'use strict';'use strict';

/**
 * API HEALTH CHECK AND VALIDATION
 * SUB-AGENT 2: Database & API Integration Testing
 *
 * Quick health check for all API endpoints and database connectivity
 */

const https = require('node:https');
const http = require('node:http');
const { URL } = require('node:url');

const _colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bright: '\x1b[1m',
};

function log(_message, _color = 'reset') {}

class APIHealthChecker {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = [];
  }

  async checkHealth() {
    log('🏥 API HEALTH CHECK - SUB-AGENT 2', 'bright');
    log('='.repeat(60), 'blue');

    // Core API endpoints to test
    const endpoints = [
      { name: 'Health Check', path: '/api/health' },
      { name: 'Database Status', path: '/api/database' },
      { name: 'Trending Data', path: '/api/trending?period=week&limit=5' },
      {
        name: 'External APIs Test',
        path: '/api/sync/external-apis?action=test',
      },
      { name: 'Artist Search', path: '/api/artists/search?q=taylor' },
      { name: 'Shows API', path: '/api/shows' },
      { name: 'Venues API', path: '/api/venues' },
      { name: 'Songs API', path: '/api/songs' },
      { name: 'Setlists API', path: '/api/setlists' },
      { name: 'Votes API', path: '/api/votes' },
      { name: 'User API', path: '/api/user' },
      { name: 'Analytics API', path: '/api/analytics' },
      { name: 'Search API', path: '/api/search?q=test' },
      { name: 'Realtime Status', path: '/api/realtime' },
      { name: 'Admin API', path: '/api/admin' },
    ];

    log('\n🔍 Testing API endpoints...\n');

    for (const endpoint of endpoints) {
      await this.testEndpoint(endpoint.name, endpoint.path);
    }

    // Test external API connections
    await this.testExternalAPIs();

    // Test database connectivity
    await this.testDatabaseHealth();

    // Generate report
    this.generateHealthReport();
  }

  async testEndpoint(name, path, method = 'GET', body = null) {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest(path, method, body);
      const duration = Date.now() - startTime;

      const result = {
        name,
        path,
        method,
        success: response.status < 400,
        status: response.status,
        duration,
        error: response.status >= 400 ? `HTTP ${response.status}` : null,
        data: response.data,
      };

      this.results.push(result);

      const statusIcon = result.success ? '✅' : '❌';
      const statusColor = result.success ? 'green' : 'red';

      log(
        `  ${statusIcon} ${name}: ${response.status} (${duration}ms)`,
        statusColor
      );
    } catch (error) {
      const duration = Date.now() - startTime;

      this.results.push({
        name,
        path,
        method,
        success: false,
        status: 0,
        duration,
        error: error.message,
      });

      log(`  ❌ ${name}: ${error.message} (${duration}ms)`, 'red');
    }
  }

  async testExternalAPIs() {
    log('\n🌐 Testing external API connections...\n');

    // Test Spotify API
    await this.testEndpoint(
      'Spotify Test',
      '/api/sync/external-apis?action=test',
      'POST',
      JSON.stringify({ artist: 'Taylor Swift' })
    );

    // Test specific sync endpoints
    await this.testEndpoint(
      'Artist Sync',
      '/api/artists/sync',
      'POST',
      JSON.stringify({ artistName: 'Test Artist' })
    );

    await this.testEndpoint('Trending Shows', '/api/trending/shows?limit=3');
    await this.testEndpoint(
      'Trending Artists',
      '/api/trending/artists?limit=3'
    );
    await this.testEndpoint('Trending Venues', '/api/trending/venues?limit=3');
  }

  async testDatabaseHealth() {
    log('\n💾 Testing database health...\n');

    // Test database connection
    await this.testEndpoint('Database Connection', '/api/database');

    // Test basic CRUD operations
    await this.testEndpoint('Test Database', '/api/test-db');

    // Test logger
    await this.testEndpoint('Logger Test', '/api/test-logger');
  }

  async makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SUB-AGENT-2-Health-Check/1.0',
        },
        timeout: 30000, // 30 second timeout
      };

      if (body) {
        options.headers['Content-Length'] = Buffer.byteLength(body);
      }

      const client = url.protocol === 'https:' ? https : http;

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = data ? JSON.parse(data) : null;
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: parsedData,
            });
          } catch (_error) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: data, // Return raw data if JSON parsing fails
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(body);
      }

      req.end();
    });
  }

  generateHealthReport() {
    log('\n📊 HEALTH REPORT\n', 'bright');
    log('='.repeat(60), 'blue');

    const total = this.results.length;
    const successful = this.results.filter((r) => r.success).length;
    const failed = this.results.filter((r) => !r.success).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    log('\n🏥 OVERALL HEALTH:');
    log(`  Total Endpoints: ${total}`);
    log(
      `  Successful: ${successful} (${((successful / total) * 100).toFixed(1)}%)`,
      'green'
    );
    log(
      `  Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)`,
      failed > 0 ? 'red' : 'green'
    );
    log(`  Total Duration: ${totalDuration}ms`);
    log(`  Average Response Time: ${(totalDuration / total).toFixed(2)}ms`);

    // Health score
    const healthScore = (successful / total) * 100;
    let healthStatus = '';
    let healthColor = '';

    if (healthScore >= 90) {
      healthStatus = 'EXCELLENT';
      healthColor = 'green';
    } else if (healthScore >= 70) {
      healthStatus = 'GOOD';
      healthColor = 'yellow';
    } else if (healthScore >= 50) {
      healthStatus = 'POOR';
      healthColor = 'red';
    } else {
      healthStatus = 'CRITICAL';
      healthColor = 'red';
    }

    log(
      `\n🎯 HEALTH SCORE: ${healthScore.toFixed(1)}% (${healthStatus})`,
      healthColor
    );

    // Failed endpoints
    const failedEndpoints = this.results.filter((r) => !r.success);
    if (failedEndpoints.length > 0) {
      log('\n❌ FAILED ENDPOINTS:');
      failedEndpoints.forEach((endpoint) => {
        log(
          `  - ${endpoint.name}: ${endpoint.error || 'Unknown error'}`,
          'red'
        );
      });
    }

    // Performance insights
    log('\n⚡ PERFORMANCE INSIGHTS:');
    const slowEndpoints = this.results
      .filter((r) => r.success && r.duration > 1000)
      .sort((a, b) => b.duration - a.duration);

    if (slowEndpoints.length > 0) {
      log('  Slow endpoints (>1s):');
      slowEndpoints.forEach((endpoint) => {
        log(`    - ${endpoint.name}: ${endpoint.duration}ms`, 'yellow');
      });
    } else {
      log('  All endpoints responded in under 1 second ✅', 'green');
    }

    // API Status by category
    log('\n📋 API STATUS BY CATEGORY:');

    const categories = {
      'Core APIs': this.results.filter((r) =>
        ['Health Check', 'Database Status', 'Trending Data'].includes(r.name)
      ),
      'External APIs': this.results.filter((r) =>
        ['Spotify Test', 'Artist Sync', 'Trending Shows'].includes(r.name)
      ),
      'Search APIs': this.results.filter((r) =>
        ['Artist Search', 'Search API'].includes(r.name)
      ),
      'Data APIs': this.results.filter((r) =>
        ['Shows API', 'Venues API', 'Songs API', 'Setlists API'].includes(
          r.name
        )
      ),
      'User APIs': this.results.filter((r) =>
        ['User API', 'Votes API', 'Analytics API'].includes(r.name)
      ),
    };

    Object.entries(categories).forEach(([category, endpoints]) => {
      if (endpoints.length > 0) {
        const categorySuccess = endpoints.filter((e) => e.success).length;
        const categoryTotal = endpoints.length;
        const categoryScore = ((categorySuccess / categoryTotal) * 100).toFixed(
          1
        );
        const categoryColor =
          categorySuccess === categoryTotal ? 'green' : 'yellow';

        log(
          `  ${category}: ${categorySuccess}/${categoryTotal} (${categoryScore}%)`,
          categoryColor
        );
      }
    });

    // Recommendations
    log('\n💡 RECOMMENDATIONS:');

    if (healthScore < 70) {
      log(
        '  - Critical: Fix failed endpoints before production deployment',
        'red'
      );
    }

    if (slowEndpoints.length > 0) {
      log('  - Optimize slow endpoints for better performance', 'yellow');
    }

    if (failedEndpoints.some((e) => e.name.includes('External'))) {
      log('  - Check external API credentials and rate limits', 'yellow');
    }

    if (healthScore >= 90) {
      log('  - System is healthy and ready for production! 🎉', 'green');
    }

    log(`\n${'='.repeat(60)}`, 'blue');
  }
}

// Main execution
async function runHealthCheck() {
  const checker = new APIHealthChecker();

  try {
    await checker.checkHealth();
  } catch (error) {
    log(`❌ Health check failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n🛑 Health check interrupted by user', 'yellow');
  process.exit(0);
});

// Run the health check
runHealthCheck().catch(console.error);
