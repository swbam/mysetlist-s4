module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:3001/",
        "http://localhost:3001/artists",
        "http://localhost:3001/shows",
        "http://localhost:3001/trending",
        "http://localhost:3001/artists/dispatch",
        "http://localhost:3001/auth/sign-in",
        "http://localhost:3001/profile",
      ],
      numberOfRuns: 5,
      startServerCommand: "pnpm dev",
      startServerReadyPattern: "ready on",
      settings: {
        preset: "desktop",
        chromeFlags: "--no-sandbox --disable-dev-shm-usage --disable-gpu",
        onlyCategories: [
          "performance",
          "accessibility",
          "best-practices",
          "seo",
          "pwa",
        ],
        throttling: {
          cpuSlowdownMultiplier: 1,
        },
        budgets: [
          {
            path: "/*",
            resourceSizes: [
              { resourceType: "script", budget: 400 },
              { resourceType: "image", budget: 500 },
              { resourceType: "stylesheet", budget: 100 },
              { resourceType: "font", budget: 100 },
              { resourceType: "total", budget: 1000 },
            ],
            resourceCounts: [
              { resourceType: "script", budget: 20 },
              { resourceType: "image", budget: 30 },
              { resourceType: "stylesheet", budget: 10 },
              { resourceType: "font", budget: 5 },
              { resourceType: "total", budget: 100 },
            ],
          },
        ],
      },
    },
    assert: {
      preset: "lighthouse:recommended",
      assertions: {
        // Performance thresholds (stricter for production)
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
        "categories:pwa": ["warn", { minScore: 0.8 }],

        // Core Web Vitals (production targets)
        "first-contentful-paint": ["warn", { maxNumericValue: 1800 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 200 }],
        "speed-index": ["warn", { maxNumericValue: 3000 }],
        interactive: ["warn", { maxNumericValue: 3500 }],

        // Resource optimization
        "unused-javascript": ["warn", { maxNumericValue: 40000 }],
        "unused-css-rules": ["warn", { maxNumericValue: 20000 }],
        "render-blocking-resources": ["warn", { maxNumericValue: 500 }],
        "unminified-javascript": ["warn", { maxNumericValue: 10000 }],
        "unminified-css": ["warn", { maxNumericValue: 5000 }],

        // Image optimization
        "modern-image-formats": ["warn", { minScore: 0.8 }],
        "uses-optimized-images": ["warn", { minScore: 0.8 }],
        "uses-responsive-images": ["warn", { minScore: 0.8 }],
        "efficient-animated-content": ["warn", { minScore: 0.8 }],

        // Caching and compression
        "uses-long-cache-ttl": ["warn", { minScore: 0.8 }],
        "uses-text-compression": ["warn", { minScore: 0.8 }],

        // Accessibility (critical for compliance)
        "color-contrast": ["error", { minScore: 1.0 }],
        "heading-order": ["error", { minScore: 1.0 }],
        "link-name": ["error", { minScore: 1.0 }],
        "button-name": ["error", { minScore: 1.0 }],
        "image-alt": ["error", { minScore: 1.0 }],
        "aria-allowed-attr": ["error", { minScore: 1.0 }],
        "aria-required-attr": ["error", { minScore: 1.0 }],
        "aria-valid-attr": ["error", { minScore: 1.0 }],

        // Best practices
        "uses-https": ["error", { minScore: 1.0 }],
        "no-vulnerable-libraries": ["error", { minScore: 1.0 }],
        "csp-xss": ["warn", { minScore: 0.8 }],
        "is-on-https": ["error", { minScore: 1.0 }],

        // SEO
        "meta-description": ["warn", { minScore: 1.0 }],
        "document-title": ["error", { minScore: 1.0 }],
        "crawlable-anchors": ["warn", { minScore: 1.0 }],
        hreflang: ["warn", { minScore: 1.0 }],
        canonical: ["warn", { minScore: 1.0 }],

        // PWA (for future enhancement)
        "installable-manifest": ["warn", { minScore: 1.0 }],
        "service-worker": ["warn", { minScore: 1.0 }],
        "themed-omnibox": ["warn", { minScore: 1.0 }],
        viewport: ["error", { minScore: 1.0 }],

        // Network efficiency
        redirects: ["warn", { maxNumericValue: 0 }],
        "uses-rel-preconnect": ["warn", { minScore: 0.8 }],
        "uses-rel-preload": ["warn", { minScore: 0.8 }],

        // JavaScript best practices
        "no-document-write": ["error", { minScore: 1.0 }],
        "uses-passive-event-listeners": ["warn", { minScore: 1.0 }],
        "no-mutation-events": ["error", { minScore: 1.0 }],
      },
    },
    upload: {
      target: "lhci",
      serverBaseUrl:
        process.env.LHCI_SERVER_BASE_URL ||
        "https://mysetlist-lighthouse.herokuapp.com",
      token: process.env.LHCI_TOKEN,
    },
    server: {
      port: 9001,
      storage: {
        storageMethod: "sql",
        sqlDialect: "postgres",
        sqlConnectionUrl: process.env.DATABASE_URL,
      },
    },
  },
}
