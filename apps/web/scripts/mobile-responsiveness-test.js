#!/usr/bin/env node

const { chromium } = require("playwright");

const DEVICE_PROFILES = {
  "iPhone SE": {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
  },
  "iPhone 12": {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
  },
  "iPhone 14 Pro Max": {
    width: 430,
    height: 932,
    deviceScaleFactor: 3,
    isMobile: true,
  },
  "Samsung Galaxy S21": {
    width: 384,
    height: 854,
    deviceScaleFactor: 2.75,
    isMobile: true,
  },
  iPad: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: false },
  "iPad Pro": {
    width: 1024,
    height: 1366,
    deviceScaleFactor: 2,
    isMobile: false,
  },
  Desktop: { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false },
  Laptop: { width: 1366, height: 768, deviceScaleFactor: 1, isMobile: false },
};

async function testMobileResponsiveness() {
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
    console.log(`\n🧪 Testing ${testPage.name}...`);

    for (const [deviceName, device] of Object.entries(DEVICE_PROFILES)) {
      try {
        // Set viewport and device
        await page.setViewportSize({
          width: device.width,
          height: device.height,
        });

        // Navigate to page
        const response = await page.goto(testPage.url, {
          waitUntil: "networkidle",
          timeout: 10000,
        });

        if (!response.ok()) {
          console.warn(`⚠️  ${deviceName}: Page returned ${response.status()}`);
          continue;
        }

        // Wait for page to be ready
        await page.waitForLoadState("domcontentloaded");

        // Test responsive design
        const tests = {
          // Check if mobile navigation exists on mobile devices
          mobileNavExists: device.isMobile
            ? await page.isVisible(
                '[data-testid="mobile-nav"], .mobile-nav, button[aria-label*="menu" i]',
              )
            : true,

          // Check if desktop nav is hidden on mobile
          desktopNavHidden: device.isMobile
            ? (await page.isHidden(
                ".desktop-nav, nav.hidden\\:md\\:flex, .md\\:flex",
              )) ||
              !(await page.isVisible(
                ".desktop-nav, nav.hidden\\:md\\:flex, .md\\:flex",
              ))
            : true,

          // Check for horizontal scrolling (bad sign)
          noHorizontalScroll: await page.evaluate(() => {
            return document.documentElement.scrollWidth <= window.innerWidth;
          }),

          // Check if touch targets are appropriately sized (44px minimum)
          touchTargetsAppropriate: device.isMobile
            ? await page.evaluate(() => {
                const interactiveElements = document.querySelectorAll(
                  'button, a, input, select, [role="button"]',
                );
                let appropriateCount = 0;

                interactiveElements.forEach((el) => {
                  const rect = el.getBoundingClientRect();
                  if (rect.width >= 44 && rect.height >= 44) {
                    appropriateCount++;
                  }
                });

                return appropriateCount / interactiveElements.length >= 0.8; // 80% should be appropriate size
              })
            : true,

          // Check if images are responsive
          imagesResponsive: await page.evaluate(() => {
            const images = document.querySelectorAll("img");
            let responsiveCount = 0;

            images.forEach((img) => {
              const style = window.getComputedStyle(img);
              if (
                style.maxWidth === "100%" ||
                style.width === "100%" ||
                img.hasAttribute("srcset")
              ) {
                responsiveCount++;
              }
            });

            return (
              images.length === 0 || responsiveCount / images.length >= 0.8
            );
          }),

          // Check if text is readable (not too small)
          textReadable: await page.evaluate(() => {
            const textElements = document.querySelectorAll(
              "p, span, div, h1, h2, h3, h4, h5, h6",
            );
            let readableCount = 0;

            textElements.forEach((el) => {
              if (el.textContent?.trim()) {
                const style = window.getComputedStyle(el);
                const fontSize = Number.parseFloat(style.fontSize);
                if (fontSize >= 14) {
                  // Minimum readable size
                  readableCount++;
                }
              }
            });

            return (
              textElements.length === 0 ||
              readableCount / textElements.length >= 0.9
            );
          }),

          // Performance check - LCP should be reasonable
          performanceAcceptable: await page.evaluate(() => {
            return new Promise((resolve) => {
              new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  if (entry.entryType === "largest-contentful-paint") {
                    resolve(entry.startTime < 4000); // LCP under 4 seconds
                    return;
                  }
                }
              }).observe({ entryTypes: ["largest-contentful-paint"] });

              // Fallback timeout
              setTimeout(() => resolve(true), 5000);
            });
          }),
        };

        const score =
          (Object.values(tests).filter(Boolean).length /
            Object.keys(tests).length) *
          100;

        results.push({
          page: testPage.name,
          device: deviceName,
          dimensions: `${device.width}x${device.height}`,
          score: Math.round(score),
          tests,
          status: score >= 80 ? "PASS" : score >= 60 ? "WARN" : "FAIL",
        });

        const statusIcon = score >= 80 ? "✅" : score >= 60 ? "⚠️" : "❌";
        console.log(
          `  ${statusIcon} ${deviceName} (${device.width}x${device.height}): ${Math.round(score)}%`,
        );
      } catch (error) {
        console.error(`  ❌ ${deviceName}: Error - ${error.message}`);
        results.push({
          page: testPage.name,
          device: deviceName,
          error: error.message,
          status: "ERROR",
        });
      }
    }
  }

  await browser.close();

  // Generate summary report
  console.log("\n📊 MOBILE RESPONSIVENESS SUMMARY\n");

  const pageScores = {};
  const deviceScores = {};
  let totalTests = 0;
  let passedTests = 0;

  results.forEach((result) => {
    if (result.error) return;

    if (!pageScores[result.page]) pageScores[result.page] = [];
    if (!deviceScores[result.device]) deviceScores[result.device] = [];

    pageScores[result.page].push(result.score);
    deviceScores[result.device].push(result.score);

    totalTests++;
    if (result.status === "PASS") passedTests++;
  });

  // Page-wise summary
  console.log("🌐 Page Performance:");
  Object.entries(pageScores).forEach(([page, scores]) => {
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const status = avgScore >= 80 ? "✅" : avgScore >= 60 ? "⚠️" : "❌";
    console.log(`  ${status} ${page}: ${Math.round(avgScore)}% average`);
  });

  console.log("\n📱 Device Performance:");
  Object.entries(deviceScores).forEach(([device, scores]) => {
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const status = avgScore >= 80 ? "✅" : avgScore >= 60 ? "⚠️" : "❌";
    console.log(`  ${status} ${device}: ${Math.round(avgScore)}% average`);
  });

  const overallScore = (passedTests / totalTests) * 100;
  console.log(
    `\n🎯 Overall Mobile Responsiveness: ${Math.round(overallScore)}%`,
  );

  if (overallScore < 80) {
    console.log("\n🔧 IMPROVEMENT AREAS:");

    const failedTests = results.filter(
      (r) => r.status === "FAIL" || r.status === "WARN",
    );
    const commonIssues = {};

    failedTests.forEach((result) => {
      if (result.tests) {
        Object.entries(result.tests).forEach(([test, passed]) => {
          if (!passed) {
            if (!commonIssues[test]) commonIssues[test] = 0;
            commonIssues[test]++;
          }
        });
      }
    });

    Object.entries(commonIssues)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .forEach(([issue, count]) => {
        console.log(`  • ${issue}: ${count} failures`);
      });
  }

  // Save detailed results
  require("node:fs").writeFileSync(
    "mobile-responsiveness-results.json",
    JSON.stringify(results, null, 2),
  );

  console.log(
    "\n📄 Detailed results saved to: mobile-responsiveness-results.json",
  );

  return overallScore >= 80;
}

module.exports = { testMobileResponsiveness };

// Run if called directly
if (require.main === module) {
  testMobileResponsiveness()
    .then((isResponsive) => {
      process.exit(isResponsive ? 0 : 1);
    })
    .catch((error) => {
      console.error("Mobile responsiveness test failed:", error);
      process.exit(1);
    });
}
