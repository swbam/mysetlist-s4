'use strict';
const axios = require('axios');

async function testDiscoverPage() {
  try {
    const discoverResponse = await axios.get('http://localhost:3001/discover', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TestBot/1.0)',
      },
    });

    if (discoverResponse.status === 200) {
    } else {
    }
  } catch (_error) {}

  try {
    const trendingResponse = await axios.get(
      'http://localhost:3001/api/trending/live?timeframe=24h&type=all&limit=5',
      {
        timeout: 5000,
      }
    );

    if (trendingResponse.status === 200 && trendingResponse.data.trending) {
    } else {
    }
  } catch (_error) {}

  try {
    const recommendationsResponse = await axios.get(
      'http://localhost:3001/api/recommendations?type=all&limit=6',
      {
        timeout: 5000,
      }
    );

    if (
      recommendationsResponse.status === 200 &&
      recommendationsResponse.data.data
    ) {
      const _data = recommendationsResponse.data.data;
      if (recommendationsResponse.data.mock) {
      }
    } else {
    }
  } catch (_error) {}

  try {
    const searchResponse = await axios.get(
      'http://localhost:3001/api/search?q=taylor&category=all&limit=10',
      {
        timeout: 5000,
      }
    );

    if (
      searchResponse.status === 200 &&
      searchResponse.data.total !== undefined
    ) {
      if (searchResponse.data.mock) {
      }
    } else {
    }
  } catch (_error) {}
}

// Run the test if this file is executed directly
if (require.main === module) {
  testDiscoverPage().catch(console.error);
}

module.exports = { testDiscoverPage };
