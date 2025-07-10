#!/usr/bin/env node

const https = require('node:https');
const http = require('node:http');
const { URL } = require('node:url');

// Test configuration
const BASE_URL = 'http://localhost:3001';

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestModule = urlObj.protocol === 'https:' ? https : http;

    const req = requestModule.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'MySetlist-DB-Test',
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
        timeout: 30000,
        ...options,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: jsonData,
              url: url,
            });
          } catch (_e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: data,
              url: url,
            });
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => reject(new Error(`Request timeout: ${url}`)));

    if (options.body) {
      req.write(
        typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body)
      );
    }

    req.end();
  });
}

async function testDatabaseContent() {
  try {
    const syncResponse = await makeRequest(`${BASE_URL}/api/artists/sync`, {
      method: 'POST',
      body: {
        artistName: 'Our Last Night',
      },
    });
    if (syncResponse.body) {
    }
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

    const searchResponse = await makeRequest(
      `${BASE_URL}/api/search?q=Our+Last+Night`
    );
    if (searchResponse.body?.results) {
      searchResponse.body.results.forEach((_result, _i) => {});
    }
    const _dispatchSync = await makeRequest(`${BASE_URL}/api/artists/sync`, {
      method: 'POST',
      body: {
        artistName: 'Dispatch',
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

    const dispatchSearch = await makeRequest(
      `${BASE_URL}/api/search?q=Dispatch`
    );
    if (dispatchSearch.body?.results) {
      dispatchSearch.body.results.forEach((_result, _i) => {});
    }
    const trendingResponse = await makeRequest(
      `${BASE_URL}/api/trending/artists`
    );
    if (trendingResponse.body) {
    }
    const createResponse = await makeRequest(`${BASE_URL}/api/artists`, {
      method: 'POST',
      body: {
        name: 'Our Last Night',
        mbid: null,
        genres: ['Post-Hardcore', 'Rock'],
        image_url: 'https://example.com/image.jpg',
      },
    });
    if (createResponse.body) {
    }
    const finalSearch = await makeRequest(
      `${BASE_URL}/api/search?q=Our+Last+Night`
    );
    if (finalSearch.body?.results) {
      finalSearch.body.results.forEach((_result, _i) => {});
    }
  } catch (_error) {}
}

// Run the test
testDatabaseContent().catch(console.error);
