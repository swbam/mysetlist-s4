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
    '@repo/rate-limit',
    '@repo/security',
    '@repo/seo',
  ],

  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Add any server-side externals if needed
      config.externals = config.externals || [];
    }

    // Handle SVG imports
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

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