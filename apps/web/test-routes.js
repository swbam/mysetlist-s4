#!/usr/bin/env node
const http = require('http');

async function testRoute(path, port = 3001) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'GET',
    }, (res) => {
      const statusCode = res.statusCode;
      console.log(`${path}: ${statusCode} ${res.statusMessage}`);
      resolve(statusCode);
    });
    
    req.on('error', (err) => {
      console.log(`${path}: ERROR - ${err.message}`);
      resolve(null);
    });
    
    req.setTimeout(5000, () => {
      console.log(`${path}: TIMEOUT`);
      req.destroy();
      resolve(null);
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('Testing critical routes...\n');
  
  const routes = [
    '/',
    '/artists',
    '/shows',
    '/venues',
    '/trending',
  ];
  
  for (const route of routes) {
    await testRoute(route);
  }
}

runTests().catch(console.error);