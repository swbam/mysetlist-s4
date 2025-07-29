#!/usr/bin/env node

import fs from "fs";
import { chromium } from "playwright";

async function captureConsoleErrors() {
  console.log("🔍 Starting console error capture...");

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const errors = [];
  const warnings = [];
  const logs = [];

  // Capture console messages
  page.on("console", async (msg) => {
    const type = msg.type();
    const text = msg.text();
    const location = msg.location();

    const logEntry = {
      type,
      text,
      location,
      timestamp: new Date().toISOString(),
    };

    if (type === "error") {
      errors.push(logEntry);
      console.log(`❌ ERROR: ${text}`);
    } else if (type === "warning") {
      warnings.push(logEntry);
      console.log(`⚠️  WARNING: ${text}`);
    } else {
      logs.push(logEntry);
    }
  });

  // Capture page errors
  page.on("pageerror", (error) => {
    const errorEntry = {
      type: "pageerror",
      text: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
    errors.push(errorEntry);
    console.log(`💥 PAGE ERROR: ${error.message}`);
  });

  // Capture request failures
  page.on("requestfailed", (request) => {
    const failureEntry = {
      type: "requestfailed",
      url: request.url(),
      failure: request.failure(),
      timestamp: new Date().toISOString(),
    };
    errors.push(failureEntry);
    console.log(
      `🌐 REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`,
    );
  });

  const pages = [
    { url: "http://localhost:3001", name: "Homepage" },
    { url: "http://localhost:3001/artists", name: "Artists Page" },
    { url: "http://localhost:3001/shows", name: "Shows Page" },
    { url: "http://localhost:3001/trending", name: "Trending Page" },
    { url: "http://localhost:3001/auth/sign-in", name: "Sign In Page" },
    { url: "http://localhost:3001/auth/sign-up", name: "Sign Up Page" },
  ];

  for (const pageInfo of pages) {
    try {
      console.log(`\n📄 Testing: ${pageInfo.name} (${pageInfo.url})`);
      await page.goto(pageInfo.url, { waitUntil: "networkidle" });
      await page.waitForTimeout(2000); // Give time for dynamic content

      // Check for specific React errors in the DOM
      const reactErrors = await page.$$eval("*", (elements) => {
        const errors = [];
        elements.forEach((el) => {
          if (el.textContent && el.textContent.includes("Error:")) {
            errors.push(el.textContent);
          }
        });
        return errors;
      });

      if (reactErrors.length > 0) {
        reactErrors.forEach((error) => {
          console.log(`⚡ REACT ERROR FOUND: ${error}`);
          errors.push({
            type: "react-error",
            text: error,
            page: pageInfo.name,
            timestamp: new Date().toISOString(),
          });
        });
      }
    } catch (error) {
      console.log(`💔 Failed to load ${pageInfo.name}: ${error.message}`);
      errors.push({
        type: "navigation-error",
        text: error.message,
        page: pageInfo.name,
        timestamp: new Date().toISOString(),
      });
    }
  }

  await browser.close();

  // Generate comprehensive report
  const report = {
    summary: {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      totalLogs: logs.length,
      timestamp: new Date().toISOString(),
    },
    errors,
    warnings,
    logs: logs.slice(-50), // Keep last 50 logs to avoid overwhelming output
  };

  // Save to file
  fs.writeFileSync(
    "console-errors-report.json",
    JSON.stringify(report, null, 2),
  );

  console.log("\n📊 CONSOLE ERROR SUMMARY:");
  console.log(`Total Errors: ${errors.length}`);
  console.log(`Total Warnings: ${warnings.length}`);
  console.log(`Total Logs: ${logs.length}`);

  if (errors.length > 0) {
    console.log("\n🚨 CRITICAL ERRORS FOUND:");
    errors.forEach((error, index) => {
      console.log(`${index + 1}. [${error.type}] ${error.text}`);
      if (error.location) {
        console.log(
          `   Location: ${error.location.url}:${error.location.lineNumber}`,
        );
      }
    });
  }

  if (warnings.length > 0) {
    console.log("\n⚠️  WARNINGS FOUND:");
    warnings.slice(0, 10).forEach((warning, index) => {
      console.log(`${index + 1}. ${warning.text}`);
    });
  }

  console.log("\n📄 Full report saved to: console-errors-report.json");

  return report;
}

// Run the capture
captureConsoleErrors().catch(console.error);
