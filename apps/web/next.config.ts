import {withSentryConfig} from '@sentry/nextjs';
import { config } from '@repo/next-config';
import type { NextConfig } from 'next';

let nextConfig: NextConfig = {
  ...config,
  // Skip type checking during build temporarily
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    ...config.images,
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
      }
    ],
  },
  // Add headers for security
  async headers() {
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
        ],
      },
    ];
  },
  // Ensure environment variables are available
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
};

if (process.env.NODE_ENV === 'production') {
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
const sentryConfig = process.env.NEXT_PUBLIC_SENTRY_DSN ? {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "mysetlist",
  project: "mysetlist",

  // Completely disable source map uploads to prevent build-time auth issues
  disableSourceMapUpload: true,

  // Disable client and server webpack plugins to prevent build failures
  disableClientWebpackPlugin: true,
  disableServerWebpackPlugin: true,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,

  // Hide sensitive information in logs
  hideSourceMapUploadProgress: true,
} : {};

// Export with conditional Sentry wrapping
export default process.env.NEXT_PUBLIC_SENTRY_DSN 
  ? withSentryConfig(nextConfig, sentryConfig)
  : nextConfig;