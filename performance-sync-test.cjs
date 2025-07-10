#!/usr/bin/env node'use strict';'use strict';

// SUB-AGENT 2: DATABASE PERFORMANCE & SYNC VALIDATION
// Real data sync performance testing with database load testing

const fs = require('node:fs');
const _https = require('node:https');

// Test Configuration
const config = {
  spotify: {
    clientId: '2946864dc822469b9c672292ead45f43',
    clientSecret: 'feaf0fc901124b839b11e02f97d18a8d',
  },
  ticketmaster: {
    apiKey: 'k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b',
  },
  setlistfm: {
    apiKey: 'xkutflW-aRy_Df9rF4OkJyCsHBYN88V37EBL',
  },
  supabase: {
    url: 'https://yzwkimtdaabyjbpykquu.supabase.co',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM',
    serviceRoleKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY5MjMxNiwiZXhwIjoyMDY2MjY4MzE2fQ.ZMorLC_eZke3bvBAF0zyzqUONxpomfTN2RpE_mLjz18',
  },
  testArtists: [
    'Taylor Swift',
    'Ed Sheeran',
    'Billie Eilish',
    'Post Malone',
    'The Weeknd',
  ],
};

// Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiCalls: 0,
      dbQueries: 0,
      totalTime: 0,
      errors: 0,
      rateLimitHits: 0,
    };
    this.startTime = Date.now();
  }

  recordApiCall(duration) {
    this.metrics.apiCalls++;
    this.metrics.totalTime += duration;
  }

  recordDbQuery(duration) {
    this.metrics.dbQueries++;
    this.metrics.totalTime += duration;
  }

  recordError() {
    this.metrics.errors++;
  }

  recordRateLimit() {
    this.metrics.rateLimitHits++;
  }

  getResults() {
    const totalTime = Date.now() - this.startTime;
    return {
      ...this.metrics,
      totalExecutionTime: totalTime,
      avgApiCallTime: this.metrics.totalTime / this.metrics.apiCalls || 0,
      callsPerSecond: (this.metrics.apiCalls / totalTime) * 1000,
      errorRate: (this.metrics.errors / this.metrics.apiCalls) * 100,
    };
  }
}

const monitor = new PerformanceMonitor();

// Database performance test
async function testDatabasePerformance() {
  const startTime = Date.now();

  try {
    // Test concurrent reads
    const readPromises = Array.from({ length: 10 }, (_, i) =>
      fetch(
        `${config.supabase.url}/rest/v1/artists?select=*&limit=100&offset=${i * 100}`,
        {
          headers: {
            Authorization: `Bearer ${config.supabase.anonKey}`,
            apikey: config.supabase.anonKey,
          },
        }
      )
    );

    const readResults = await Promise.all(readPromises);
    const readTime = Date.now() - startTime;

    let totalArtists = 0;
    for (const result of readResults) {
      if (result.ok) {
        const data = await result.json();
        totalArtists += data.length;
      }
    }

    monitor.recordDbQuery(readTime);

    // Test database write performance (using service role)
    const writeStartTime = Date.now();

    const testArtist = {
      name: `Test Artist ${Date.now()}`,
      slug: `test-artist-${Date.now()}`,
      popularity: Math.floor(Math.random() * 100),
      verified: false,
    };

    const writeResponse = await fetch(
      `${config.supabase.url}/rest/v1/artists`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
          apikey: config.supabase.serviceRoleKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testArtist),
      }
    );

    const writeTime = Date.now() - writeStartTime;

    if (writeResponse.ok) {
      monitor.recordDbQuery(writeTime);

      // Clean up test data
      const insertedData = await writeResponse.json();
      if (insertedData.length > 0) {
        await fetch(
          `${config.supabase.url}/rest/v1/artists?id=eq.${insertedData[0].id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
              apikey: config.supabase.serviceRoleKey,
            },
          }
        );
      }
    } else {
      monitor.recordError();
    }

    return {
      success: true,
      readTime,
      writeTime,
      totalArtists,
    };
  } catch (error) {
    monitor.recordError();
    return { success: false, error: error.message };
  }
}

// Real sync performance test
async function testSyncPerformance() {
  const results = [];

  // Get Spotify token
  const tokenStartTime = Date.now();
  const authResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${config.spotify.clientId}:${config.spotify.clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  const tokenTime = Date.now() - tokenStartTime;
  const authData = await authResponse.json();
  monitor.recordApiCall(tokenTime);

  // Test sync performance for multiple artists
  for (const artistName of config.testArtists) {
    const artistStartTime = Date.now();

    try {
      // 1. Spotify artist search
      const spotifyStartTime = Date.now();
      const spotifyResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${authData.access_token}`,
          },
        }
      );

      const spotifyTime = Date.now() - spotifyStartTime;
      monitor.recordApiCall(spotifyTime);

      if (!spotifyResponse.ok) {
        throw new Error(`Spotify search failed: ${spotifyResponse.status}`);
      }

      const spotifyData = await spotifyResponse.json();
      const artist = spotifyData.artists.items[0];

      if (!artist) {
        throw new Error('Artist not found on Spotify');
      }

      // 2. Ticketmaster shows search
      const tmStartTime = Date.now();
      const tmResponse = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${config.ticketmaster.apiKey}&keyword=${encodeURIComponent(artistName)}&size=50&classificationName=Music`
      );

      const tmTime = Date.now() - tmStartTime;
      monitor.recordApiCall(tmTime);

      let tmEvents = 0;
      if (tmResponse.ok) {
        const tmData = await tmResponse.json();
        tmEvents = tmData._embedded?.events?.length || 0;
      }

      // 3. Setlist.fm search
      const setlistStartTime = Date.now();
      const setlistResponse = await fetch(
        `https://api.setlist.fm/rest/1.0/search/artists?artistName=${encodeURIComponent(artistName)}&p=1&sort=relevance`,
        {
          headers: {
            'x-api-key': config.setlistfm.apiKey,
            Accept: 'application/json',
            'User-Agent': 'MySetlist/1.0',
          },
        }
      );

      const setlistTime = Date.now() - setlistStartTime;
      monitor.recordApiCall(setlistTime);

      let setlistCount = 0;
      if (setlistResponse.ok) {
        const setlistData = await setlistResponse.json();
        setlistCount = setlistData.artist?.length || 0;
      }

      // 4. Database check/upsert simulation
      const dbStartTime = Date.now();
      const _dbResponse = await fetch(
        `${config.supabase.url}/rest/v1/artists?select=*&spotify_id=eq.${artist.id}`,
        {
          headers: {
            Authorization: `Bearer ${config.supabase.anonKey}`,
            apikey: config.supabase.anonKey,
          },
        }
      );

      const dbTime = Date.now() - dbStartTime;
      monitor.recordDbQuery(dbTime);

      const totalTime = Date.now() - artistStartTime;

      const result = {
        artist: artistName,
        spotifyId: artist.id,
        popularity: artist.popularity,
        followers: artist.followers.total,
        spotifyTime,
        tmTime,
        tmEvents,
        setlistTime,
        setlistCount,
        dbTime,
        totalTime,
        success: true,
      };

      results.push(result);

      // Rate limiting delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      monitor.recordError();
      results.push({
        artist: artistName,
        success: false,
        error: error.message,
        totalTime: Date.now() - artistStartTime,
      });
    }
  }

  return results;
}

// Main performance test
async function runPerformanceTests() {
  const dbResults = await testDatabasePerformance();
  const syncResults = await testSyncPerformance();

  const metrics = monitor.getResults();

  const successfulSyncs = syncResults.filter((r) => r.success);
  if (successfulSyncs.length > 0) {
    const _avgSpotifyTime =
      successfulSyncs.reduce((sum, r) => sum + r.spotifyTime, 0) /
      successfulSyncs.length;
    const _avgTmTime =
      successfulSyncs.reduce((sum, r) => sum + r.tmTime, 0) /
      successfulSyncs.length;
    const _avgSetlistTime =
      successfulSyncs.reduce((sum, r) => sum + r.setlistTime, 0) /
      successfulSyncs.length;
    const _avgDbTime =
      successfulSyncs.reduce((sum, r) => sum + r.dbTime, 0) /
      successfulSyncs.length;
    const _avgTotalTime =
      successfulSyncs.reduce((sum, r) => sum + r.totalTime, 0) /
      successfulSyncs.length;

    const _totalEvents = successfulSyncs.reduce(
      (sum, r) => sum + r.tmEvents,
      0
    );
    const _totalSetlists = successfulSyncs.reduce(
      (sum, r) => sum + r.setlistCount,
      0
    );
  }

  const isProductionReady =
    metrics.errorRate < 5 &&
    metrics.avgApiCallTime < 2000 &&
    dbResults.success &&
    successfulSyncs.length > 0;

  if (isProductionReady) {
  } else {
    if (metrics.errorRate >= 5) {
    }
    if (metrics.avgApiCallTime >= 2000) {
    }
    if (!dbResults.success) {
    }
    if (successfulSyncs.length === 0) {
    }
  }

  // Save results to file
  const reportData = {
    timestamp: new Date().toISOString(),
    metrics,
    dbResults,
    syncResults,
    isProductionReady,
    recommendations: [
      'Implement caching layer',
      'Add retry logic',
      'Queue system for batch operations',
      'Rate limit monitoring',
      'Error alerting system',
    ],
  };

  fs.writeFileSync(
    './database-performance-report.json',
    JSON.stringify(reportData, null, 2)
  );

  return isProductionReady;
}

// Execute performance tests
runPerformanceTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((_error) => {
    process.exit(1);
  });
