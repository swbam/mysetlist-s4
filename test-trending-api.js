#!/usr/bin/env node

const http = require('http');

async function testTrendingAPI() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/trending/live?timeframe=24h&limit=5',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('\n=== Response Body ===');
        try {
          const parsed = JSON.parse(data);
          console.log(JSON.stringify(parsed, null, 2));
          resolve(parsed);
        } catch (e) {
          console.log('Raw response:', data);
          console.log('Parse error:', e.message);
          resolve(data);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
      reject(e);
    });

    req.setTimeout(10000, () => {
      console.error('Request timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

testTrendingAPI().catch(console.error);