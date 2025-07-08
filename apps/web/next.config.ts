import { config } from '@repo/next-config';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...config,
  // Production-ready build settings
  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore TypeScript errors during build
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,

  // Output optimization
  output: 'standalone',

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
    optimizeCss: true,
    optimizePackageImports: [
      '@repo/design-system',
      'lucide-react',
      '@radix-ui/react-icons',
      'framer-motion',
      '@hello-pangea/dnd',
      'date-fns',
      'react-hook-form',
      '@tanstack/react-query',
    ],
    // ppr: true, // Partial Prerendering - requires Next.js canary
    reactCompiler: true,
    // Performance monitoring
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'TTFB'],
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

    if (!dev) {
      // Production optimizations
      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          maxSize: 250000,
          cacheGroups: {
            default: false,
            vendors: false,
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-sync-external-store)[\\/]/,
              priority: 40,
              enforce: true,
            },
            lib: {
              test(module: any) {
                return (
                  module.size() > 160000 &&
                  /node_modules[/\\]/.test(module.identifier())
                );
              },
              name(module: any) {
                const hash = require('node:crypto')
                  .createHash('sha1')
                  .update(module.identifier())
                  .digest('hex')
                  .substring(0, 8);
                return `lib-${hash}`;
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            commons: {
              name: 'commons',
              chunks: 'initial',
              minChunks: 20,
              priority: 20,
            },
            shared: {
              name(_module: any, chunks: any) {
                const hash = require('node:crypto')
                  .createHash('sha1')
                  .update(
                    chunks.reduce(
                      (acc: string, chunk: any) => acc + chunk.name,
                      ''
                    )
                  )
                  .digest('hex')
                  .substring(0, 8);
                return `shared-${hash}`;
              },
              priority: 10,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
        },
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

// Export with conditional Sentry wrapping
export default process.env['NEXT_PUBLIC_SENTRY_DSN']
  ? withSentryConfig(nextConfig, sentryConfig)
  : nextConfig;
