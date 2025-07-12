// Performance optimization configuration
export const performanceConfig = {
  // Image optimization
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Bundle optimization
  bundleAnalyzer: {
    enabled: process.env.ANALYZE === 'true',
    openAnalyzer: true,
  },

  // React optimization
  react: {
    // Strict mode helps identify performance issues
    strictMode: true,
    // React compiler for automatic optimizations
    compiler: true,
  },

  // Caching strategies
  cache: {
    // API response caching
    api: {
      trending: 300, // 5 minutes
      artists: 3600, // 1 hour
      shows: 1800, // 30 minutes
      venues: 86400, // 24 hours
      search: 600, // 10 minutes
    },
    // Static asset caching
    static: {
      images: 31536000, // 1 year
      fonts: 31536000, // 1 year
      css: 86400, // 24 hours
      js: 86400, // 24 hours
    },
  },

  // Prefetching configuration
  prefetch: {
    // Prefetch visible links
    viewport: true,
    // Prefetch on hover/focus
    intent: true,
    // Maximum number of prefetches
    maxPrefetches: 10,
    // Prefetch throttle delay (ms)
    throttle: 500,
  },

  // Code splitting
  splitting: {
    // Routes to preload
    preloadRoutes: ['/trending', '/artists', '/shows'],
    // Chunk size limits
    maxInitialChunkSize: 250000, // 250KB
    maxAsyncChunkSize: 150000, // 150KB
  },

  // Service worker
  serviceWorker: {
    enabled: false, // Disabled due to conflicts
    scope: '/',
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
        },
      },
      {
        urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'jsdelivr',
          expiration: {
            maxEntries: 30,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
    ],
  },

  // Performance budgets
  budgets: {
    // JavaScript budget
    js: {
      firstParty: 200000, // 200KB
      thirdParty: 100000, // 100KB
    },
    // CSS budget
    css: {
      total: 50000, // 50KB
    },
    // Image budget per page
    images: {
      total: 1000000, // 1MB
      perImage: 200000, // 200KB
    },
    // Web vitals targets
    vitals: {
      lcp: 2500, // 2.5s
      fid: 100, // 100ms
      cls: 0.1,
      ttfb: 600, // 600ms
    },
  },

  // Resource hints
  resourceHints: {
    // DNS prefetch for external domains
    dnsPrefetch: [
      'https://fonts.googleapis.com',
      'https://www.googletagmanager.com',
      'https://cdn.jsdelivr.net',
    ],
    // Preconnect to critical origins
    preconnect: [
      { url: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { url: process.env.NEXT_PUBLIC_SUPABASE_URL || '', crossOrigin: 'anonymous' },
    ],
  },
};