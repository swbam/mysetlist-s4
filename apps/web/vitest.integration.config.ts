import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts", "./vitest.integration.setup.ts"],
    globals: true,
    testTimeout: 30000, // Increased timeout for integration tests
    hookTimeout: 10000,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true, // Run integration tests sequentially to avoid conflicts
      },
    },
    // Only run integration tests
    include: [
      "__tests__/integration/**/*.{test,spec}.{ts,tsx}",
      "__tests__/e2e/**/*.{test,spec}.{ts,tsx}",
      "__tests__/api/**/*.{test,spec}.{ts,tsx}",
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
        "__tests__/**",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "cypress/",
        "tests/",
        "test-results/",
        "playwright-report/",
      ],
      include: ["app/**", "components/**", "lib/**", "hooks/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "~": path.resolve(__dirname, "./"),
      "@repo": path.resolve(__dirname, "../../packages"),
    },
  },
})
