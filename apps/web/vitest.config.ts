import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // The web application currently has an extensive suite of E2E, integration and
    // Playwright-based tests that are not intended to be executed by Vitest. To
    // avoid pulling those files into the Vitest run (which causes numerous
    // runtime failures because the globals differ), we narrow the matching
    // pattern to **unit-level** tests only. If we need to add further unit
    // coverage in the future, place the files alongside the code using the
    // `.unit.test.{ts,tsx}` or `.unit.spec.{ts,tsx}` suffix so they are
    // discovered by the patterns below.
    include: [
      "**/*.unit.{test,spec}.{ts,tsx}",
    ],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
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
      include: ["app/**", "components/**", "lib/**", "hooks/**"],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
      },
    },
    testTimeout: 10000,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "~": path.resolve(__dirname, "./"),
      "@repo": path.resolve(__dirname, "../../packages"),
    },
  },
});
