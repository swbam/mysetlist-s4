#!/usr/bin/env tsx

/**
 * Test script to verify all search endpoints are working correctly
 * Tests the consistency of Ticketmaster API usage across search components
 */

import fetch from "node-fetch";

const BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3001";

interface TestResult {
  endpoint: string;
  query: string;
  success: boolean;
  responseTime: number;
  dataCount: number;
  error?: string;
  sampleData?: any;
}

async function testEndpoint(
  endpoint: string,
  query: string,
): Promise<TestResult> {
  const url = `${BASE_URL}${endpoint}?q=${encodeURIComponent(query)}&limit=5`;
  const startTime = Date.now();

  try {
    const response = await fetch(url);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json();
      return {
        endpoint,
        query,
        success: false,
        responseTime,
        dataCount: 0,
        error: `HTTP ${response.status}: ${errorData.message || "Unknown error"}`,
      };
    }

    const data = await response.json();

    // Determine data count based on endpoint response structure
    let dataCount = 0;
    let sampleData = null;

    if (endpoint.includes("/artists/search")) {
      dataCount = data.artists?.length || 0;
      sampleData = data.artists?.[0];
    } else if (endpoint.includes("/search/suggestions")) {
      dataCount = data.suggestions?.length || 0;
      sampleData = data.suggestions?.[0];
    } else if (endpoint.includes("/search")) {
      dataCount = data.results?.length || 0;
      sampleData = data.results?.[0];
    }

    return {
      endpoint,
      query,
      success: true,
      responseTime,
      dataCount,
      sampleData,
    };
  } catch (error) {
    return {
      endpoint,
      query,
      success: false,
      responseTime: Date.now() - startTime,
      dataCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function runSearchTests() {
  console.log("🔍 Testing Search Endpoints for TheSet App");
  console.log("=".repeat(50));

  const testQueries = [
    "Taylor Swift",
    "Coldplay",
    "The Beatles",
    "Red Hot Chili Peppers",
  ];

  const endpoints = [
    "/api/artists/search", // Primary artist search (Ticketmaster)
    "/api/search", // General search (should use Ticketmaster for artists)
    "/api/search/suggestions", // Suggestions (updated to use Ticketmaster)
  ];

  const results: TestResult[] = [];

  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing ${endpoint}`);
    console.log("-".repeat(30));

    for (const query of testQueries) {
      process.stdout.write(`  Testing "${query}"... `);
      const result = await testEndpoint(endpoint, query);
      results.push(result);

      if (result.success) {
        console.log(
          `✅ ${result.dataCount} results (${result.responseTime}ms)`,
        );
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
    }
  }

  // Summary Report
  console.log("\n📊 Test Summary");
  console.log("=".repeat(50));

  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.endpoint]) acc[result.endpoint] = [];
      acc[result.endpoint].push(result);
      return acc;
    },
    {} as Record<string, TestResult[]>,
  );

  for (const [endpoint, endpointResults] of Object.entries(groupedResults)) {
    const successCount = endpointResults.filter((r) => r.success).length;
    const totalCount = endpointResults.length;
    const avgResponseTime =
      endpointResults
        .filter((r) => r.success)
        .reduce((sum, r) => sum + r.responseTime, 0) / successCount || 0;
    const totalDataCount = endpointResults
      .filter((r) => r.success)
      .reduce((sum, r) => sum + r.dataCount, 0);

    console.log(`\n${endpoint}:`);
    console.log(
      `  Success Rate: ${successCount}/${totalCount} (${Math.round((successCount / totalCount) * 100)}%)`,
    );
    console.log(`  Avg Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`  Total Results: ${totalDataCount} artists found`);

    // Show sample data structure
    const sampleData = endpointResults.find(
      (r) => r.success && r.sampleData,
    )?.sampleData;
    if (sampleData) {
      console.log(
        "  Sample Data Structure:",
        `${JSON.stringify(sampleData, null, 2).slice(0, 200)}...`,
      );
    }

    // Show failures
    const failures = endpointResults.filter((r) => !r.success);
    if (failures.length > 0) {
      console.log("  Failures:");
      failures.forEach((f) => {
        console.log(`    - "${f.query}": ${f.error}`);
      });
    }
  }

  // Data Consistency Check
  console.log("\n🔍 Data Consistency Analysis");
  console.log("=".repeat(50));

  const artistsSearchResults = results.filter(
    (r) => r.endpoint === "/api/artists/search" && r.success,
  );
  const generalSearchResults = results.filter(
    (r) => r.endpoint === "/api/search" && r.success,
  );

  if (artistsSearchResults.length > 0 && generalSearchResults.length > 0) {
    console.log("✅ Both primary endpoints are functional");
    console.log("📋 Checking data structure consistency...");

    const artistsSample = artistsSearchResults[0]?.sampleData;
    const generalSample = generalSearchResults[0]?.sampleData;

    if (artistsSample && generalSample) {
      const artistsFields = Object.keys(artistsSample);
      const generalFields = Object.keys(generalSample);

      console.log(
        `  /api/artists/search fields: [${artistsFields.join(", ")}]`,
      );
      console.log(`  /api/search fields: [${generalFields.join(", ")}]`);

      const commonFields = artistsFields.filter((f) =>
        generalFields.includes(f),
      );
      console.log(`  Common fields: [${commonFields.join(", ")}]`);
    }
  }

  // Performance Analysis
  console.log("\n⚡ Performance Analysis");
  console.log("=".repeat(50));

  const successfulResults = results.filter((r) => r.success);
  const avgResponseTime =
    successfulResults.reduce((sum, r) => sum + r.responseTime, 0) /
    successfulResults.length;
  const maxResponseTime = Math.max(
    ...successfulResults.map((r) => r.responseTime),
  );
  const minResponseTime = Math.min(
    ...successfulResults.map((r) => r.responseTime),
  );

  console.log(`Average Response Time: ${Math.round(avgResponseTime)}ms`);
  console.log(`Fastest Response: ${minResponseTime}ms`);
  console.log(`Slowest Response: ${maxResponseTime}ms`);

  if (avgResponseTime > 2000) {
    console.log("⚠️  WARNING: Average response time is high (>2s)");
  } else if (avgResponseTime > 1000) {
    console.log("⚠️  CAUTION: Average response time is elevated (>1s)");
  } else {
    console.log("✅ Response times are acceptable");
  }

  // Final Status
  console.log("\n🎯 Final Status");
  console.log("=".repeat(50));

  const totalSuccess = results.filter((r) => r.success).length;
  const totalTests = results.length;
  const overallSuccessRate = Math.round((totalSuccess / totalTests) * 100);

  console.log(
    `Overall Success Rate: ${totalSuccess}/${totalTests} (${overallSuccessRate}%)`,
  );

  if (overallSuccessRate >= 95) {
    console.log("🎉 EXCELLENT: All search endpoints are working properly!");
  } else if (overallSuccessRate >= 80) {
    console.log(
      "✅ GOOD: Most endpoints are working, but some issues detected",
    );
  } else if (overallSuccessRate >= 60) {
    console.log("⚠️  WARNING: Several endpoints have issues");
  } else {
    console.log("❌ CRITICAL: Major issues with search endpoints");
  }

  // Recommendations
  console.log("\n💡 Recommendations");
  console.log("=".repeat(50));

  if (
    results.some((r) => r.endpoint === "/api/search/suggestions" && !r.success)
  ) {
    console.log(
      "• Fix the suggestions endpoint to use Ticketmaster API consistently",
    );
  }

  if (avgResponseTime > 1000) {
    console.log(
      "• Consider implementing response caching to improve performance",
    );
  }

  const ticketmasterFailures = results.filter(
    (r) => !r.success && r.error?.includes("Ticketmaster"),
  );
  if (ticketmasterFailures.length > 0) {
    console.log("• Check Ticketmaster API configuration and rate limits");
  }

  console.log(
    "• Ensure all artist search components use /api/artists/search for consistency",
  );
  console.log("• Consider implementing error fallback mechanisms");

  process.exit(overallSuccessRate >= 80 ? 0 : 1);
}

// Run the tests if called directly
if (require.main === module) {
  runSearchTests().catch((error) => {
    console.error("💥 Test runner failed:", error);
    process.exit(1);
  });
}

export { runSearchTests, testEndpoint };
