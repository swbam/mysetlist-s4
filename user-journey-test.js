#!/usr/bin/env node

/**
 * User Journey Testing
 * Agent 10: End-to-End User Experience Testing
 */

import http from 'node:http';
import https from 'node:https';

const BASE_URL = 'http://localhost:3001';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
    const client = url.startsWith('https:') ? https : http;

    const req = client.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MySetlist-Test/1.0)',
          Accept: 'text/html,application/json,*/*',
          ...options.headers,
        },
      },
      (res) => {
        clearTimeout(timeout);
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            size: Buffer.byteLength(data, 'utf8'),
          });
        });
      }
    );

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

class UserJourneyTester {
  constructor() {
    this.results = {
      journeys: [],
      performance: {},
      accessibility: {},
      functionality: {},
    };
  }

  async testJourney(name, steps) {
    const journeyStart = Date.now();
    const stepResults = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepStart = Date.now();

      try {
        const result = await step.action();
        const stepTime = Date.now() - stepStart;

        if (step.validation && !step.validation(result)) {
          throw new Error('Validation failed');
        }

        stepResults.push({
          step: i + 1,
          description: step.description,
          success: true,
          time: stepTime,
          status: result.statusCode,
        });
      } catch (error) {
        const stepTime = Date.now() - stepStart;
        stepResults.push({
          step: i + 1,
          description: step.description,
          success: false,
          time: stepTime,
          error: error.message,
        });
      }
    }

    const journeyTime = Date.now() - journeyStart;
    const successCount = stepResults.filter((r) => r.success).length;
    const successRate = (successCount / stepResults.length) * 100;

    this.results.journeys.push({
      name,
      totalTime: journeyTime,
      steps: stepResults,
      successRate,
      successful: successRate === 100,
    });
    return { successRate, totalTime: journeyTime, steps: stepResults };
  }

  async testDiscoveryJourney() {
    return await this.testJourney('Music Discovery', [
      {
        description: 'Visit homepage',
        action: () => makeRequest(BASE_URL),
        validation: (result) =>
          result.statusCode === 200 && result.size > 100000,
      },
      {
        description: 'Search for popular artist',
        action: () =>
          makeRequest(`${BASE_URL}/api/search?q=Taylor%20Swift&type=artists`),
        validation: (result) => result.statusCode === 200,
      },
      {
        description: 'Browse trending artists',
        action: () => makeRequest(`${BASE_URL}/api/trending/artists`),
        validation: (result) => result.statusCode === 200,
      },
      {
        description: 'Visit trending page',
        action: () => makeRequest(`${BASE_URL}/trending`),
        validation: (result) => result.statusCode === 200,
      },
      {
        description: 'Browse artists page',
        action: () => makeRequest(`${BASE_URL}/artists`),
        validation: (result) => result.statusCode === 200,
      },
    ]);
  }

  async testSearchJourney() {
    return await this.testJourney('Search Experience', [
      {
        description: 'Visit search page',
        action: () => makeRequest(`${BASE_URL}/search`),
        validation: (result) => result.statusCode === 200,
      },
      {
        description: 'Search for artists',
        action: () =>
          makeRequest(`${BASE_URL}/api/search?q=Beatles&type=artists`),
        validation: (result) => result.statusCode === 200,
      },
      {
        description: 'Search for venues',
        action: () =>
          makeRequest(
            `${BASE_URL}/api/search?q=Madison%20Square%20Garden&type=venues`
          ),
        validation: (result) => result.statusCode === 200,
      },
      {
        description: 'Search for shows',
        action: () =>
          makeRequest(`${BASE_URL}/api/search?q=concert&type=shows`),
        validation: (result) => result.statusCode === 200,
      },
      {
        description: 'Get search suggestions',
        action: () => makeRequest(`${BASE_URL}/api/search/suggestions?q=rock`),
        validation: (result) => result.statusCode === 200,
      },
    ]);
  }

  async testVenueExplorationJourney() {
    return await this.testJourney('Venue Exploration', [
      {
        description: 'Visit venues page',
        action: () => makeRequest(`${BASE_URL}/venues`),
        validation: (result) => result.statusCode === 200,
      },
      {
        description: 'Search venues',
        action: () =>
          makeRequest(`${BASE_URL}/api/search?q=theater&type=venues`),
        validation: (result) => result.statusCode === 200,
      },
    ]);
  }

  async testShowJourney() {
    return await this.testJourney('Show Discovery', [
      {
        description: 'Visit shows page',
        action: () => makeRequest(`${BASE_URL}/shows`),
        validation: (result) => result.statusCode === 200,
      },
      {
        description: 'Search for shows',
        action: () => makeRequest(`${BASE_URL}/api/search?q=live&type=shows`),
        validation: (result) => result.statusCode === 200,
      },
    ]);
  }

  async testAuthenticationJourney() {
    return await this.testJourney('Authentication Flow', [
      {
        description: 'Visit sign-in page',
        action: () => makeRequest(`${BASE_URL}/auth/sign-in`),
        validation: (result) => result.statusCode === 200,
      },
      {
        description: 'Visit sign-up page',
        action: () => makeRequest(`${BASE_URL}/auth/sign-up`),
        validation: (result) => result.statusCode === 200,
      },
    ]);
  }

  async testPerformanceMetrics() {
    const tests = [
      { name: 'Homepage load', url: BASE_URL },
      { name: 'Search page load', url: `${BASE_URL}/search` },
      { name: 'API response time', url: `${BASE_URL}/api/search?q=test` },
    ];

    for (const test of tests) {
      const start = Date.now();
      try {
        const result = await makeRequest(test.url);
        const time = Date.now() - start;
        this.results.performance[test.name] = {
          time,
          status: result.statusCode,
          size: result.size,
        };

        if (time < 1000) {
        } else if (time < 3000) {
        } else {
        }
      } catch (_error) {}
    }
  }

  async testMobileResponsiveness() {
    const mobileHeaders = {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    };

    const pages = ['/', '/search', '/artists', '/shows', '/venues'];

    for (const page of pages) {
      try {
        const result = await makeRequest(`${BASE_URL}${page}`, {
          headers: mobileHeaders,
        });
        const _isMobileFriendly =
          (result.data.includes('viewport') &&
            result.data.includes('mobile-friendly')) ||
          result.data.includes('responsive');
      } catch (_error) {}
    }
  }

  async testAccessibility() {
    const pages = ['/', '/search', '/artists'];

    for (const page of pages) {
      try {
        const result = await makeRequest(`${BASE_URL}${page}`);

        const hasAltTags = result.data.includes('alt=');
        const hasAriaLabels = result.data.includes('aria-label');
        const hasSemanticHTML =
          result.data.includes('<main') || result.data.includes('<nav');
        const hasSkipLinks =
          result.data.includes('skip-to-content') ||
          result.data.includes('skip-link');

        const score = [
          hasAltTags,
          hasAriaLabels,
          hasSemanticHTML,
          hasSkipLinks,
        ].filter(Boolean).length;

        this.results.accessibility[page] = {
          altTags: hasAltTags,
          ariaLabels: hasAriaLabels,
          semanticHTML: hasSemanticHTML,
          skipLinks: hasSkipLinks,
          score,
        };
      } catch (_error) {}
    }
  }

  generateReport() {
    const totalJourneys = this.results.journeys.length;
    const successfulJourneys = this.results.journeys.filter(
      (j) => j.successful
    ).length;

    this.results.journeys.forEach((journey) => {
      const _status = journey.successful ? '✅' : '⚠️';
    });
    Object.entries(this.results.performance).forEach(([_test, metrics]) => {
      const _status =
        metrics.time < 1000 ? '🚀' : metrics.time < 3000 ? '✅' : '⚠️';
    });
    const accessibilityScores = Object.values(this.results.accessibility).map(
      (a) => a.score
    );
    const avgAccessibility =
      accessibilityScores.length > 0
        ? accessibilityScores.reduce((a, b) => a + b, 0) /
          accessibilityScores.length
        : 0;
    const overallScore =
      (successfulJourneys / totalJourneys) * 0.4 +
      (avgAccessibility / 4) * 0.3 +
      (Object.values(this.results.performance).filter((p) => p.time < 3000)
        .length /
        Object.keys(this.results.performance).length) *
        0.3;

    if (overallScore >= 0.9) {
    } else if (overallScore >= 0.7) {
    } else if (overallScore >= 0.5) {
    } else {
    }

    return {
      overallScore,
      journeySuccess: successfulJourneys / totalJourneys,
      performance: this.results.performance,
      accessibility: avgAccessibility / 4,
    };
  }

  async runAllTests() {
    const startTime = Date.now();

    // Run all user journeys
    await this.testDiscoveryJourney();
    await this.testSearchJourney();
    await this.testVenueExplorationJourney();
    await this.testShowJourney();
    await this.testAuthenticationJourney();

    // Run performance and accessibility tests
    await this.testPerformanceMetrics();
    await this.testMobileResponsiveness();
    await this.testAccessibility();

    const endTime = Date.now();
    const _totalTime = ((endTime - startTime) / 1000).toFixed(2);

    return this.generateReport();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new UserJourneyTester();
  tester
    .runAllTests()
    .then(() => process.exit(0))
    .catch((_error) => {
      process.exit(1);
    });
}

export { UserJourneyTester };
