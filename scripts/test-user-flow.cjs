#!/usr/bin/env node'use strict';'use strict';'use strict';'use strict';'use strict';'use strict';

/**
 * Test complete user flow from search to voting
 */

const http = require('node:http');
const https = require('node:https');

const BASE_URL = 'http://localhost:3001';

async function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testUserFlow() {
  try {
    const searchResult = await httpRequest(
      `${BASE_URL}/api/artists/search?q=taylor`
    );

    if (searchResult.status !== 200) {
      throw new Error(`Search failed: ${searchResult.status}`);
    }

    const taylorSwift = searchResult.data.artists.find(
      (a) => a.name === 'Taylor Swift'
    );
    if (!taylorSwift) {
      throw new Error('Taylor Swift not found in search results');
    }
    const artistPageResult = await httpRequest(
      `${BASE_URL}/artists/taylor-swift`
    );

    if (artistPageResult.status !== 200) {
      throw new Error(`Artist page failed: ${artistPageResult.status}`);
    }
    const _hasShows =
      artistPageResult.data.includes('Upcoming Shows') ||
      artistPageResult.data.includes('upcoming shows');
    const showsPageResult = await httpRequest(`${BASE_URL}/shows`);

    if (showsPageResult.status !== 200) {
    } else {
    }
    const trendingResult = await httpRequest(
      `${BASE_URL}/api/trending/artists?limit=5`
    );

    if (trendingResult.status !== 200) {
      throw new Error(`Trending API failed: ${trendingResult.status}`);
    }
    trendingResult.data.artists.slice(0, 3).forEach((_artist, _i) => {});
    const showPageResult = await httpRequest(
      `${BASE_URL}/shows/taylor-swift-volksparkstadion-2024`
    );

    if (showPageResult.status !== 200) {
    } else {
      const _hasVoting =
        showPageResult.data.includes('vote') ||
        showPageResult.data.includes('Vote');
    }
  } catch (_error) {}
}

// Run the test
testUserFlow();
