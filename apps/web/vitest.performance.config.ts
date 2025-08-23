/**
 * Vitest Configuration for Performance and SLO Testing
 * Separate configuration for performance-critical tests with longer timeouts
 */

import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    include: [
      "__tests__/unit/**/*.test.{ts,tsx}",
      "__tests__/integration/**/*.test.{ts,tsx}",
      "__tests__/e2e/**/*.test.{ts,tsx}",
      "__tests__/quality/**/*.test.{ts,tsx}",
      "__tests__/acceptance/**/*.test.{ts,tsx}",
    ],
    exclude: [
      "node_modules/",
      ".next/",
      "coverage/",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        ".next/",
        "coverage/",
        "**/*.d.ts",
        "**/*.config.{ts,js}",
        "**/types/**",
        "**/__tests__/**",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "cypress/",
        "tests/",
        "test-results/",
        "playwright-report/",
      ],
      include: [
        "app/**",
        "components/**", 
        "lib/**",
        "hooks/**"
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Specific thresholds for critical modules
        "lib/services/orchestrators/**": {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        "lib/services/ingest/**": {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    // Extended timeouts for performance tests
    testTimeout: 60000, // 60 seconds for E2E and acceptance tests
    hookTimeout: 30000, // 30 seconds for setup/teardown
    
    // Performance-optimized test execution
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },
    
    // Fail fast for CI environments
    bail: process.env['CI'] ? 1 : 0,
    
    // Reporter configuration
    reporters: process.env['CI'] 
      ? ["verbose", "github-actions"]
      : ["verbose", "html"],
    
    outputFile: {
      html: "./test-results/performance-report.html",
      json: "./test-results/performance-results.json",
    },
    
    // Environment variables for tests
    env: {
      NODE_ENV: "test",
      VITEST_PERFORMANCE_MODE: "true",
    },
    
    // Memory management for large tests
    isolate: true,
    sequence: {
      concurrent: true,
      shuffle: false, // Keep deterministic for performance measurement
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "~": path.resolve(__dirname, "./"),
      "@repo": path.resolve(__dirname, "../../packages"),
    },
  },
  // Optimize for test performance
  esbuild: {
    target: "node18",
  },
});