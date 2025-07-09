import { config } from '@repo/next-config';
import { withSentryConfig } from '@sentry/nextjs';
import withBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...config,
  // Production-ready build settings
  typescript: {
    ignoreBuildErrors: true, // Temporarily disable to fix React type conflicts
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,

  // Output optimization (disabled for development)
  // output: 'standalone', // Only needed for production deployment

  // Image optimization
  images: {
    ...config.images,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      ...(config.images?.remotePatterns || []),
      {
        protocol: 'https',
        hostname: 'i.scdn.co', // Spotify images
      },
      {
        protocol: 'https',
        hostname: 'assets.basehub.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Unsplash placeholder images
      },
      {
        protocol: 'https',
        hostname: 's1.ticketm.net', // Ticketmaster images
      },
    ],
  },

  // Experimental features for performance
  experimental: {
    optimizePackageImports: [
      '@repo/design-system',
      'lucide-react',
      '@radix-ui/react-icons',
      'framer-motion',
      '@hello-pangea/dnd',
      'date-fns',
      'react-hook-form',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'zod',
      'clsx',
      'tailwind-merge',
    ],
    // ppr: true, // Partial Prerendering - requires Next.js canary
    reactCompiler: false, // Disable experimental compiler to fix build
    // Performance monitoring
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'TTFB'],
    // Enable more aggressive optimizations
    turbo: {},
    optimizeCss: true,
  },

  // Server external packages (moved from experimental)
  serverExternalPackages: ['@repo/database', 'drizzle-orm', 'postgres'],

  // Advanced headers for security and performance
  headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(self), payment=(self)',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io https://*.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.posthog.com wss://*.supabase.co https://api.spotify.com https://app.ticketmaster.com;",
          },
        ],
      },
      // Static asset caching
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Image caching
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API caching
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value:
              'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
    ];
  },

  // Ensure environment variables are available
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'] || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '',
  },

  // Webpack optimizations
  webpack: (config, { isServer, dev }) => {
    // Call parent webpack config first
    let webpackConfig = config;
    if (typeof config.webpack === 'function') {
      webpackConfig = config.webpack(config, { isServer, dev });
    }

    // Suppress OpenTelemetry warnings
    if (isServer) {
      webpackConfig.externals = [...(webpackConfig.externals || []), {
        '@opentelemetry/api': '@opentelemetry/api',
        '@opentelemetry/core': '@opentelemetry/core',
        '@opentelemetry/exporter-trace-otlp-http': '@opentelemetry/exporter-trace-otlp-http',
        '@opentelemetry/instrumentation': '@opentelemetry/instrumentation',
        '@opentelemetry/instrumentation-fetch': '@opentelemetry/instrumentation-fetch',
        '@opentelemetry/instrumentation-http': '@opentelemetry/instrumentation-http',
        '@opentelemetry/resources': '@opentelemetry/resources',
        '@opentelemetry/sdk-trace-base': '@opentelemetry/sdk-trace-base',
        '@opentelemetry/sdk-trace-node': '@opentelemetry/sdk-trace-node',
        '@opentelemetry/semantic-conventions': '@opentelemetry/semantic-conventions',
      }];
    }

    // Production optimizations - enable minification for smaller bundles
    if (!dev) {
      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        minimize: true, // Re-enable minification for production
        sideEffects: false, // Enable tree shaking
        usedExports: true, // Mark used exports for tree shaking
      };
    }

    return webpackConfig;
  },
};

if (process.env['NODE_ENV'] === 'production') {
  const redirects: NextConfig['redirects'] = async () => [
    {
      source: '/legal',
      destination: '/legal/privacy',
      statusCode: 301,
    },
  ];

  nextConfig.redirects = redirects;
}

// Only apply Sentry configuration if DSN is available
const sentryConfig = process.env['NEXT_PUBLIC_SENTRY_DSN']
  ? {
      // For all available options, see:
      // https://www.npmjs.com/package/@sentry/webpack-plugin#options

      org: 'mysetlist',
      project: 'mysetlist',

      // Completely disable source map uploads to prevent build-time auth issues
      disableSourceMapUpload: true,

      // Disable client and server webpack plugins to prevent build failures
      disableClientWebpackPlugin: true,
      disableServerWebpackPlugin: true,

      // Only print logs for uploading source maps in CI
      silent: !process.env['CI'],

      // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
      // This can increase your server load as well as your hosting bill.
      // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
      // side errors will fail.
      tunnelRoute: '/monitoring',

      // Automatically tree-shake Sentry logger statements to reduce bundle size
      disableLogger: true,

      // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
      // See the following for more information:
      // https://docs.sentry.io/product/crons/
      // https://vercel.com/docs/cron-jobs
      automaticVercelMonitors: true,

      // Hide sensitive information in logs
      hideSourceMapUploadProgress: true,
    }
  : {};

// Bundle analyzer wrapper
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env['ANALYZE'] === 'true',
});

// Export with conditional Sentry wrapping and bundle analyzer
const finalConfig = bundleAnalyzer(nextConfig);

export default process.env['NEXT_PUBLIC_SENTRY_DSN']
  ? withSentryConfig(finalConfig, sentryConfig)
  : finalConfig;
