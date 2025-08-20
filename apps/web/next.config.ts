/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features
  experimental: {
    optimizeCss: true,
  },

  // Transpile packages from the monorepo
  transpilePackages: [
    '@repo/database',
    '@repo/design-system',
    '@repo/email',
    '@repo/feature-flags',
    '@repo/internationalization',
    '@repo/next-config',
    '@repo/observability',
    '@repo/queues',
    '@repo/rate-limit',
    '@repo/security',
    '@repo/seo',
  ],

  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Add any server-side externals if needed
      config.externals = config.externals || [];
    } else {
      // Client-side: externalize Node.js built-ins and server-only packages
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        util: false,
        url: false,
        assert: false,
        http: false,
        https: false,
        'perf_hooks': false,
        'child_process': false,
        'server-only': false,
        'node:crypto': false,
        'node:stream': false,
        'node:path': false,
        'node:url': false,
        'node:util': false,
        'node:os': false,
        'node:fs': false,
        'node:net': false,
        'node:tls': false,
        'node:http': false,
        'node:https': false,
      };
    }

    // Handle SVG imports
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    // Add path aliases to match TypeScript paths
    config.resolve.alias = {
      ...config.resolve.alias,
      '~': __dirname,
      '@': __dirname,
      "node:crypto": false,
      "node:fs": false,
      "node:net": false,
      "node:tls": false,
      "node:perf_hooks": false,
    };

    return config;
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Bundle analyzer (for pnpm analyze)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: '../bundle-analyzer.html',
          })
        );
      }
      return config;
    },
  }),
};

module.exports = nextConfig;