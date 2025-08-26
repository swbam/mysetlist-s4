/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // Transpile packages from the monorepo
  transpilePackages: [
    '@repo/database',
    '@repo/design-system',
    '@repo/external-apis',
    '@repo/auth',
    '@repo/email',
    '@repo/feature-flags',
    '@repo/internationalization',
    '@repo/next-config',
    '@repo/observability',
    '@repo/rate-limit',
    '@repo/security',
    '@repo/seo',
    '@repo/env',
    '@repo/utils',
    '@repo/typescript-config',
  ],

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        pathname: '/image/**',
      },
      {
        protocol: 'https',
        hostname: 's1.ticketm.net',
        pathname: '/dam/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Security headers
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
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Redirects for legacy URLs
  async redirects() {
    return [
      {
        source: '/app/(.*)',
        destination: '/$1',
        permanent: true,
      },
    ];
  },

  // Rewrites for API routes
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
      {
        source: '/healthz',
        destination: '/api/health',
      },
    ];
  },

  // Bundle analyzer
  ...(process.env.ANALYZE === 'true' && {
    webpack: async (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = await import('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: '../bundle-analyzer-report.html',
          })
        );
      }
      return config;
    },
  }),

  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Optimize for production
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }

    return config;
  },

  // Output configuration
  output: 'standalone',
  
  // Disable x-powered-by header
  poweredByHeader: false,

  // Compression
  compress: true,

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NODE_ENV,
  },
};

export default nextConfig;