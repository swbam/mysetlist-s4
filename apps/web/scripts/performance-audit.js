#!/usr/bin/env node

const { chromium } = require("playwright");

async function runPerformanceAudit() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const pages = [
    { name: "Homepage", url: "http://localhost:3001" },
    { name: "Artists", url: "http://localhost:3001/artists" },
    { name: "Shows", url: "http://localhost:3001/shows" },
    { name: "Trending", url: "http://localhost:3001/trending" },
    { name: "Search", url: "http://localhost:3001/search" },
  ];

  const results = [];

  for (const testPage of pages) {
    console.log(`\n⚡ Testing ${testPage.name} performance...`);

    try {
      // Enable performance monitoring
      await page.addInitScript(() => {
        window.performanceData = {
          navigationStart: performance.now(),
          metrics: {},
          resources: [],
        };

        // Track Core Web Vitals
        const vitals = ["FCP", "LCP", "FID", "CLS", "TTFB"];
        vitals.forEach((vital) => {
          window.performanceData.metrics[vital] = null;
        });
      });

      const navigationStart = Date.now();

      // Navigate and measure
      const response = await page.goto(testPage.url, {
        waitUntil: "networkidle",
        timeout: 15000,
      });

      const navigationEnd = Date.now();
      const navigationTime = navigationEnd - navigationStart;

      if (!response.ok()) {
        throw new Error(`Page returned ${response.status()}`);
      }

      // Wait for page to be fully loaded
      await page.waitForLoadState("domcontentloaded");

      // Measure Core Web Vitals and other metrics
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const data = {
            // Navigation Timing
            navigationTiming: {},
            // Core Web Vitals
            coreWebVitals: {},
            // Custom metrics
            customMetrics: {},
            // Resource analysis
            resources: [],
          };

          // Get Navigation Timing
          const navigation = performance.getEntriesByType("navigation")[0];
          if (navigation) {
            data.navigationTiming = {
              domContentLoaded:
                navigation.domContentLoadedEventEnd -
                navigation.domContentLoadedEventStart,
              loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
              ttfb: navigation.responseStart - navigation.requestStart,
              domInteractive:
                navigation.domInteractive - navigation.navigationStart,
              domComplete: navigation.domComplete - navigation.navigationStart,
            };
          }

          // Collect Core Web Vitals
          const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              switch (entry.entryType) {
                case "paint":
                  if (entry.name === "first-contentful-paint") {
                    data.coreWebVitals.FCP = entry.startTime;
                  }
                  break;
                case "largest-contentful-paint":
                  data.coreWebVitals.LCP = entry.startTime;
                  break;
                case "first-input":
                  data.coreWebVitals.FID =
                    entry.processingStart - entry.startTime;
                  break;
                case "layout-shift":
                  if (!entry.hadRecentInput) {
                    data.coreWebVitals.CLS =
                      (data.coreWebVitals.CLS || 0) + entry.value;
                  }
                  break;
              }
            });
          });

          try {
            observer.observe({
              entryTypes: [
                "paint",
                "largest-contentful-paint",
                "first-input",
                "layout-shift",
              ],
            });
          } catch (e) {
            // Fallback for unsupported browsers
          }

          // Get resource timing
          const resources = performance.getEntriesByType("resource");
          data.resources = resources.map((resource) => ({
            name: resource.name,
            duration: resource.duration,
            size: resource.transferSize || 0,
            type: resource.initiatorType,
          }));

          // Custom metrics
          data.customMetrics = {
            // Memory usage (Chrome only)
            memoryUsage: performance.memory
              ? {
                  usedJSHeapSize: performance.memory.usedJSHeapSize,
                  totalJSHeapSize: performance.memory.totalJSHeapSize,
                  jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                }
              : null,

            // DOM stats
            domElements: document.querySelectorAll("*").length,
            images: document.querySelectorAll("img").length,
            scripts: document.querySelectorAll("script").length,
            stylesheets: document.querySelectorAll('link[rel="stylesheet"]')
              .length,

            // Bundle analysis
            scriptSizes: Array.from(
              document.querySelectorAll("script[src]"),
            ).map((script) => ({
              src: script.src,
              async: script.async,
              defer: script.defer,
            })),
          };

          // Wait a bit for vitals to be collected
          setTimeout(() => resolve(data), 2000);
        });
      });

      // Bundle size analysis
      const resourceAnalysis = {
        totalSize: metrics.resources.reduce((sum, r) => sum + r.size, 0),
        javascriptSize: metrics.resources
          .filter((r) => r.type === "script")
          .reduce((sum, r) => sum + r.size, 0),
        cssSize: metrics.resources
          .filter((r) => r.type === "stylesheet")
          .reduce((sum, r) => sum + r.size, 0),
        imageSize: metrics.resources
          .filter((r) => r.type === "img")
          .reduce((sum, r) => sum + r.size, 0),
        slowResources: metrics.resources.filter((r) => r.duration > 1000),
        largeResources: metrics.resources.filter((r) => r.size > 100000), // > 100KB
      };

      // Performance scoring based on Web Vitals thresholds
      const scores = {
        FCP: metrics.coreWebVitals.FCP
          ? metrics.coreWebVitals.FCP < 1800
            ? 100
            : metrics.coreWebVitals.FCP < 3000
              ? 50
              : 0
          : null,
        LCP: metrics.coreWebVitals.LCP
          ? metrics.coreWebVitals.LCP < 2500
            ? 100
            : metrics.coreWebVitals.LCP < 4000
              ? 50
              : 0
          : null,
        FID: metrics.coreWebVitals.FID
          ? metrics.coreWebVitals.FID < 100
            ? 100
            : metrics.coreWebVitals.FID < 300
              ? 50
              : 0
          : null,
        CLS: metrics.coreWebVitals.CLS
          ? metrics.coreWebVitals.CLS < 0.1
            ? 100
            : metrics.coreWebVitals.CLS < 0.25
              ? 50
              : 0
          : null,
        TTFB: metrics.navigationTiming.ttfb
          ? metrics.navigationTiming.ttfb < 800
            ? 100
            : metrics.navigationTiming.ttfb < 1800
              ? 50
              : 0
          : null,
        bundleSize:
          resourceAnalysis.totalSize < 1000000
            ? 100 // < 1MB
            : resourceAnalysis.totalSize < 2000000
              ? 50
              : 0, // < 2MB
      };

      const validScores = Object.values(scores).filter((s) => s !== null);
      const overallScore =
        validScores.length > 0
          ? Math.round(
              validScores.reduce((sum, score) => sum + score, 0) /
                validScores.length,
            )
          : 0;

      const result = {
        page: testPage.name,
        url: testPage.url,
        timestamp: new Date().toISOString(),
        navigationTime,
        coreWebVitals: metrics.coreWebVitals,
        navigationTiming: metrics.navigationTiming,
        resourceAnalysis,
        customMetrics: metrics.customMetrics,
        scores,
        overallScore,
        status:
          overallScore >= 80
            ? "EXCELLENT"
            : overallScore >= 60
              ? "GOOD"
              : overallScore >= 40
                ? "NEEDS_IMPROVEMENT"
                : "POOR",
      };

      results.push(result);

      // Log key metrics
      const statusIcon =
        overallScore >= 80
          ? "🚀"
          : overallScore >= 60
            ? "⚡"
            : overallScore >= 40
              ? "⚠️"
              : "🐌";
      console.log(`  ${statusIcon} Overall Score: ${overallScore}%`);
      console.log(`  📊 Core Web Vitals:`);
      console.log(
        `     FCP: ${metrics.coreWebVitals.FCP?.toFixed(0) || "N/A"}ms`,
      );
      console.log(
        `     LCP: ${metrics.coreWebVitals.LCP?.toFixed(0) || "N/A"}ms`,
      );
      console.log(
        `     FID: ${metrics.coreWebVitals.FID?.toFixed(0) || "N/A"}ms`,
      );
      console.log(
        `     CLS: ${metrics.coreWebVitals.CLS?.toFixed(3) || "N/A"}`,
      );
      console.log(
        `  📦 Bundle: ${(resourceAnalysis.totalSize / 1024).toFixed(0)}KB total`,
      );
      console.log(`  🏃 Navigation: ${navigationTime}ms`);
    } catch (error) {
      console.error(`  ❌ Error testing ${testPage.name}:`, error.message);
      results.push({
        page: testPage.name,
        url: testPage.url,
        error: error.message,
        status: "ERROR",
      });
    }
  }

  await browser.close();

  // Generate comprehensive report
  console.log(`\n📈 PERFORMANCE AUDIT SUMMARY\n`);

  const successfulResults = results.filter((r) => !r.error);
  const averageScore =
    successfulResults.length > 0
      ? Math.round(
          successfulResults.reduce((sum, r) => sum + r.overallScore, 0) /
            successfulResults.length,
        )
      : 0;

  console.log(`🎯 Overall Performance Score: ${averageScore}%`);

  // Page rankings
  console.log(`\n🏆 Page Performance Rankings:`);
  successfulResults
    .sort((a, b) => b.overallScore - a.overallScore)
    .forEach((result, idx) => {
      const medal =
        idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "📄";
      console.log(
        `  ${medal} ${result.page}: ${result.overallScore}% (${result.status})`,
      );
    });

  // Performance insights
  if (successfulResults.length > 0) {
    console.log(`\n💡 PERFORMANCE INSIGHTS:`);

    const avgMetrics = {
      FCP: successfulResults
        .filter((r) => r.coreWebVitals.FCP)
        .map((r) => r.coreWebVitals.FCP),
      LCP: successfulResults
        .filter((r) => r.coreWebVitals.LCP)
        .map((r) => r.coreWebVitals.LCP),
      bundleSize: successfulResults.map((r) => r.resourceAnalysis.totalSize),
    };

    if (avgMetrics.FCP.length > 0) {
      const avgFCP =
        avgMetrics.FCP.reduce((a, b) => a + b, 0) / avgMetrics.FCP.length;
      console.log(
        `  • Average First Contentful Paint: ${avgFCP.toFixed(0)}ms ${avgFCP < 1800 ? "✅" : "❌"}`,
      );
    }

    if (avgMetrics.LCP.length > 0) {
      const avgLCP =
        avgMetrics.LCP.reduce((a, b) => a + b, 0) / avgMetrics.LCP.length;
      console.log(
        `  • Average Largest Contentful Paint: ${avgLCP.toFixed(0)}ms ${avgLCP < 2500 ? "✅" : "❌"}`,
      );
    }

    const avgBundleSize =
      avgMetrics.bundleSize.reduce((a, b) => a + b, 0) /
      avgMetrics.bundleSize.length;
    console.log(
      `  • Average Bundle Size: ${(avgBundleSize / 1024).toFixed(0)}KB ${avgBundleSize < 1000000 ? "✅" : "❌"}`,
    );

    // Common issues
    const issues = [];
    successfulResults.forEach((result) => {
      if (result.coreWebVitals.LCP > 2500) issues.push("Slow LCP");
      if (result.coreWebVitals.FCP > 1800) issues.push("Slow FCP");
      if (result.coreWebVitals.FID > 100) issues.push("Poor FID");
      if (result.coreWebVitals.CLS > 0.1) issues.push("High CLS");
      if (result.resourceAnalysis.totalSize > 1000000)
        issues.push("Large bundle size");
      if (result.resourceAnalysis.slowResources.length > 0)
        issues.push("Slow resources");
    });

    if (issues.length > 0) {
      console.log(`\n🔧 COMMON ISSUES FOUND:`);
      const issueCount = {};
      issues.forEach((issue) => {
        issueCount[issue] = (issueCount[issue] || 0) + 1;
      });

      Object.entries(issueCount)
        .sort(([, a], [, b]) => b - a)
        .forEach(([issue, count]) => {
          console.log(`  • ${issue}: ${count} pages affected`);
        });
    }
  }

  // Target recommendations
  if (averageScore < 80) {
    console.log(`\n🎯 OPTIMIZATION RECOMMENDATIONS:`);
    console.log(`  1. 🖼️  Optimize images (WebP format, proper sizing)`);
    console.log(`  2. 📦 Reduce bundle size (code splitting, tree shaking)`);
    console.log(`  3. ⚡ Implement caching strategies`);
    console.log(`  4. 🔄 Add React.memo() to heavy components`);
    console.log(`  5. 📊 Monitor Web Vitals in production`);
    console.log(`  6. 🚀 Consider CDN for static assets`);
  }

  // Save detailed results
  require("fs").writeFileSync(
    "performance-audit-results.json",
    JSON.stringify(results, null, 2),
  );

  console.log(`\n📄 Detailed results saved to: performance-audit-results.json`);

  return averageScore >= 80;
}

module.exports = { runPerformanceAudit };

// Run if called directly
if (require.main === module) {
  runPerformanceAudit()
    .then((isPerformant) => {
      process.exit(isPerformant ? 0 : 1);
    })
    .catch((error) => {
      console.error("Performance audit failed:", error);
      process.exit(1);
    });
}
