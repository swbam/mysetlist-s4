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
      "__tests__/**/*.{test,spec}.{ts,tsx}",
      "!__tests__/**/integration/**",
      "!__tests__/**/e2e/**",
      "!__tests__/**/api/**",
      "!__tests__/**/mobile/**",
      "!__tests__/**/navigation/**",
      "!__tests__/**/auth/**",
      "!__tests__/**/shows/**",
    ],
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
