import withBundleAnalyzer from '@next/bundle-analyzer';

// @ts-expect-error No declaration file
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';
import type { NextConfig } from 'next';

const otelRegex = /@opentelemetry\/instrumentation/;

const isProd = process.env.NODE_ENV === 'production';

export const config: NextConfig = {
  // Core performance settings
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      // Add base patterns here - apps can extend
    ],
  },

  // Experimental performance features
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    workerThreads: false,
    cpus: 4,
    isrFlushToDisk: true,
    ppr: true, // Partial Prerendering
    reactCompiler: true,
    turbo: {
      resolveAlias: {
        // Add common aliases for faster resolution
        '@': ['./src'],
        '@components': ['./src/components'],
        '@lib': ['./src/lib'],
        '@hooks': ['./src/hooks'],
      },
    },
  },

  // Server external packages (moved from experimental)
  serverExternalPackages: ['@repo/database', 'drizzle-orm', 'postgres'],

  // biome-ignore lint/suspicious/useAwait: rewrites is async
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://us.i.posthog.com/decide',
      },
    ];
  },

  webpack(config, { isServer, dev }) {
    if (isServer) {
      config.plugins = config.plugins || [];
      config.plugins.push(new PrismaPlugin());
    }

    config.ignoreWarnings = [{ module: otelRegex }];

    // Production optimizations
    if (!dev) {
      // Enable webpack cache
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };

      // Optimize module resolution
      config.resolve = {
        ...config.resolve,
        symlinks: false,
        alias: {
          ...config.resolve?.alias,
          // Add performance-critical aliases
        },
      };

      // Module optimizations
      config.module = {
        ...config.module,
        rules: [
          ...(config.module?.rules || []),
          // Add babel-loader cache
          {
            test: /\.(js|jsx|ts|tsx)$/,
            exclude: /node_modules/,
            use: [
              {
                loader: 'babel-loader',
                options: {
                  cacheDirectory: true,
                  cacheCompression: false,
                },
              },
            ],
          },
        ],
      };
    }

    return config;
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,

  // Output configuration
  distDir: '.next',
  cleanDistDir: true,
  assetPrefix: isProd ? process.env.NEXT_PUBLIC_ASSET_PREFIX || '' : '',

  // Compiler options
  compiler: {
    removeConsole: isProd
      ? {
          exclude: ['error', 'warn'],
        }
      : false,
    reactRemoveProperties: isProd
      ? {
          properties: ['^data-testid$'],
        }
      : false,
  },

  // Modular imports for tree shaking
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
    '@radix-ui/react-icons': {
      transform: '@radix-ui/react-icons/dist/{{member}}',
    },
  },
};

export const withAnalyzer = (sourceConfig: NextConfig): NextConfig => {
  const bundleAnalyzer = withBundleAnalyzer({
    enabled: process.env.ANALYZE === 'true',
    openAnalyzer: true,
  });

  return bundleAnalyzer(sourceConfig);
};
