#!/usr/bin/env node

/**
 * DATABASE INTEGRATION TEST RUNNER
 * SUB-AGENT 2: Database & API Integration Testing
 *
 * Runs comprehensive database and API integration tests
 */

const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const _colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
  bright: "\x1b[1m",
};

function log(_message, _color = "reset") {}

function checkEnvironment() {
  log("🔍 Checking environment...", "blue");

  // Check if we're in the right directory
  const packageJsonPath = path.join(process.cwd(), "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    log(
      "❌ package.json not found. Please run from the packages/database directory.",
      "red",
    );
    process.exit(1);
  }

  // Check if the test file exists
  const testFilePath = path.join(process.cwd(), "test-database-integration.ts");
  if (!fs.existsSync(testFilePath)) {
    log("❌ test-database-integration.ts not found.", "red");
    process.exit(1);
  }

  log("✅ Environment check passed", "green");
}

function runTests() {
  log("🚀 Starting database integration tests...", "cyan");

  const testProcess = spawn(
    "npx",
    ["ts-node", "test-database-integration.ts"],
    {
      stdio: "inherit",
      cwd: process.cwd(),
    },
  );

  testProcess.on("close", (code) => {
    if (code === 0) {
      log("\n✅ All tests completed successfully!", "green");
    } else {
      log(`\n❌ Tests failed with exit code ${code}`, "red");
      process.exit(code);
    }
  });

  testProcess.on("error", (error) => {
    log(`❌ Failed to start test process: ${error.message}`, "red");
    process.exit(1);
  });
}

function main() {
  log("SUB-AGENT 2: DATABASE & API INTEGRATION TESTING", "bright");
  log("=".repeat(60), "blue");

  checkEnvironment();
  runTests();
}

// Handle process termination
process.on("SIGINT", () => {
  log("\n🛑 Tests interrupted by user", "yellow");
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("\n🛑 Tests terminated", "yellow");
  process.exit(0);
});

main();
