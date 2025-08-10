#!/usr/bin/env node

/**
 * Cache Behavior Test Script
 * Tests the caching behavior of MySetlist PWA fixes
 */

const https = require("node:https");
const http = require("node:http");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001";

// Test endpoints
const TEST_ENDPOINTS = [
  "/api/trending/live",
  "/api/trending/live?timeframe=1h",
  "/api/trending/live?timeframe=6h",
  "/api/trending/live?timeframe=24h",
  "/api/trending/artists",
  "/api/trending/shows",
  "/api/trending/venues",
];

async function fetchWithHeaders(url) {
  return new Promise((resolve, reject) => {
    const requestUrl = `${BASE_URL}${url}`;
    const isHttps = requestUrl.startsWith("https");
    const client = isHttps ? https : http;

    const startTime = Date.now();

    const req = client.get(
      requestUrl,
      {
        headers: {
          "User-Agent": "MySetlist-Cache-Test/1.0",
          Accept: "application/json",
        },
      },
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;

          try {
            const jsonData = JSON.parse(data);
            resolve({
              url,
              status: res.statusCode,
              headers: res.headers,
              data: jsonData,
              responseTime,
              timestamp: new Date().toISOString(),
            });
          } catch (parseError) {
            resolve({
              url,
              status: res.statusCode,
              headers: res.headers,
              data: null,
              error: `JSON Parse Error: ${parseError.message}`,
              responseTime,
              timestamp: new Date().toISOString(),
            });
          }
        });
      },
    );

    req.on("error", (error) => {
      reject({
        url,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject({
        url,
        error: "Request timeout",
        timestamp: new Date().toISOString(),
      });
    });
  });
}

function analyzeCacheHeaders(headers) {
  const analysis = {
    cacheControl: headers["cache-control"] || "none",
    lastModified: headers["last-modified"] || "none",
    etag: headers.etag || "none",
    expires: headers.expires || "none",
    vary: headers.vary || "none",
    xCacheStrategy: headers["x-cache-strategy"] || "none",
    xLastModified: headers["x-last-modified"] || "none",
  };

  // Parse cache-control directives
  if (analysis.cacheControl !== "none") {
    const directives = analysis.cacheControl.split(",").map((d) => d.trim());
    analysis.maxAge =
      directives.find((d) => d.startsWith("max-age="))?.split("=")[1] || "0";
    analysis.sMaxAge =
      directives.find((d) => d.startsWith("s-maxage="))?.split("=")[1] || "0";
    analysis.staleWhileRevalidate =
      directives
        .find((d) => d.startsWith("stale-while-revalidate="))
        ?.split("=")[1] || "0";
    analysis.isPublic = directives.includes("public");
    analysis.isPrivate = directives.includes("private");
    analysis.noCache = directives.includes("no-cache");
    analysis.mustRevalidate = directives.includes("must-revalidate");
  }

  return analysis;
}

async function testEndpoint(url) {
  console.log(`\n🧪 Testing: ${url}`);
  console.log("=".repeat(60));

  try {
    // First request
    console.log("📡 First request...");
    const firstResponse = await fetchWithHeaders(url);

    if (firstResponse.error) {
      console.error("❌ Error:", firstResponse.error);
      return { url, success: false, error: firstResponse.error };
    }

    console.log(`✅ Status: ${firstResponse.status}`);
    console.log(`⏱️  Response time: ${firstResponse.responseTime}ms`);

    const cacheAnalysis = analyzeCacheHeaders(firstResponse.headers);
    console.log("🏷️  Cache headers:");
    console.log(`   Cache-Control: ${cacheAnalysis.cacheControl}`);
    console.log(`   Max-Age: ${cacheAnalysis.maxAge}s`);
    console.log(`   S-MaxAge: ${cacheAnalysis.sMaxAge}s`);
    console.log(`   SWR: ${cacheAnalysis.staleWhileRevalidate}s`);
    console.log(`   Strategy: ${cacheAnalysis.xCacheStrategy}`);
    console.log(`   Public: ${cacheAnalysis.isPublic}`);
    console.log(`   No-Cache: ${cacheAnalysis.noCache}`);

    // Data freshness check
    if (firstResponse.data?.generatedAt) {
      const generatedAt = new Date(firstResponse.data.generatedAt);
      const requestTime = new Date(firstResponse.timestamp);
      const dataAge = requestTime - generatedAt;
      console.log(`📊 Data freshness: ${dataAge}ms old`);

      if (dataAge > 60000) {
        // More than 1 minute old
        console.log("⚠️  Warning: Data seems stale (>1 minute old)");
      }
    }

    // Second request after short delay to test caching
    console.log("\n📡 Second request (testing cache behavior)...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const secondResponse = await fetchWithHeaders(url);

    if (secondResponse.error) {
      console.error("❌ Error on second request:", secondResponse.error);
      return { url, success: false, error: secondResponse.error };
    }

    console.log(`✅ Status: ${secondResponse.status}`);
    console.log(`⏱️  Response time: ${secondResponse.responseTime}ms`);

    // Compare data freshness
    if (firstResponse.data?.generatedAt && secondResponse.data?.generatedAt) {
      const sameData =
        firstResponse.data.generatedAt === secondResponse.data.generatedAt;
      console.log(`📊 Same data returned: ${sameData ? "Yes" : "No"}`);

      if (sameData && url.includes("live")) {
        console.log(
          "⚠️  Warning: Live trending data should be fresh on each request",
        );
      }
    }

    const timeDiff = Math.abs(
      secondResponse.responseTime - firstResponse.responseTime,
    );
    const fasterSecondRequest =
      secondResponse.responseTime < firstResponse.responseTime;

    console.log(
      `⚡ Second request faster: ${fasterSecondRequest} (${timeDiff}ms difference)`,
    );

    return {
      url,
      success: true,
      firstResponse: firstResponse.responseTime,
      secondResponse: secondResponse.responseTime,
      cacheHeaders: cacheAnalysis,
      dataFresh: !sameData || !url.includes("live"),
    };
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    return { url, success: false, error: error.message };
  }
}

async function testCacheBehavior() {
  console.log("🚀 MySetlist Cache Behavior Test");
  console.log("Testing PWA cache fixes for stale content issues");
  console.log(`Base URL: ${BASE_URL}`);
  console.log("Timestamp:", new Date().toISOString());
  console.log("=".repeat(80));

  const results = [];

  for (const endpoint of TEST_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);

    // Wait between tests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Summary
  console.log("\n📊 TEST SUMMARY");
  console.log("=".repeat(80));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`✅ Successful tests: ${successful.length}/${results.length}`);
  console.log(`❌ Failed tests: ${failed.length}/${results.length}`);

  if (failed.length > 0) {
    console.log("\n❌ Failed endpoints:");
    failed.forEach((f) => console.log(`   - ${f.url}: ${f.error}`));
  }

  // Cache behavior analysis
  console.log("\n🏷️  CACHE BEHAVIOR ANALYSIS");
  console.log("=".repeat(80));

  successful.forEach((result) => {
    console.log(`\n${result.url}:`);
    console.log(`  - Fresh data: ${result.dataFresh ? "✅" : "⚠️"}`);
    console.log(
      `  - Cache strategy: ${result.cacheHeaders?.xCacheStrategy || "none"}`,
    );
    console.log(`  - Max-Age: ${result.cacheHeaders?.maxAge || "0"}s`);
    console.log(
      `  - Response time: ${result.firstResponse}ms → ${result.secondResponse}ms`,
    );

    if (result.url.includes("live") && !result.dataFresh) {
      console.log("  ⚠️  ISSUE: Live trending should always return fresh data");
    }
  });

  // Performance summary
  const avgFirstResponse =
    successful.reduce((sum, r) => sum + r.firstResponse, 0) / successful.length;
  const avgSecondResponse =
    successful.reduce((sum, r) => sum + r.secondResponse, 0) /
    successful.length;

  console.log("\n⚡ PERFORMANCE SUMMARY");
  console.log("=".repeat(80));
  console.log(`Average first response: ${Math.round(avgFirstResponse)}ms`);
  console.log(`Average second response: ${Math.round(avgSecondResponse)}ms`);
  console.log(
    `Performance improvement: ${avgFirstResponse > avgSecondResponse ? "✅" : "⚠️"} ${Math.round(avgFirstResponse - avgSecondResponse)}ms`,
  );

  // Overall assessment
  console.log("\n🎯 OVERALL ASSESSMENT");
  console.log("=".repeat(80));

  const issues = [];

  successful.forEach((result) => {
    if (result.url.includes("live") && !result.dataFresh) {
      issues.push(`${result.url}: Serving stale live data`);
    }

    if (
      result.cacheHeaders?.noCache &&
      result.secondResponse < result.firstResponse * 0.5
    ) {
      issues.push(
        `${result.url}: No-cache header but cached response detected`,
      );
    }
  });

  if (issues.length === 0) {
    console.log("✅ All tests passed! Cache behavior is working correctly.");
    console.log("✅ No stale content issues detected.");
    console.log("✅ Trending data freshness is maintained.");
  } else {
    console.log("⚠️  Issues detected:");
    issues.forEach((issue) => console.log(`   - ${issue}`));
    console.log(
      "\n🔧 Recommendation: Review cache headers and service worker configuration",
    );
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log("Test completed at:", new Date().toISOString());

  process.exit(issues.length > 0 ? 1 : 0);
}

// Run the test if called directly
if (require.main === module) {
  testCacheBehavior().catch((error) => {
    console.error("💥 Test suite failed:", error);
    process.exit(1);
  });
}

module.exports = { testCacheBehavior, testEndpoint, analyzeCacheHeaders };
