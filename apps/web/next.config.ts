import type { NextConfig } from "next";

// Bundle analyzer configuration
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env["ANALYZE"] === "true",
});

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  // Vercel deployment configuration
  output: "standalone",

  // Production optimization features
  experimental: {
    // Enable React 19 optimizations
    ppr: false, // Partial Prerendering disabled for compatibility
    optimizeServerReact: true,
    optimizeCss: true,
    // Enable optimizations for bundle size
    optimizePackageImports: [
      "@repo/design-system",
      "@repo/database",
      "@repo/auth",
      "@repo/external-apis",
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-icons",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tabs",
      "@radix-ui/react-popover",
      "@radix-ui/react-avatar",
      "@radix-ui/react-command",
      "@supabase/supabase-js",
      "@supabase/auth-helpers-nextjs",
      "recharts",
      "@hello-pangea/dnd",
      "date-fns",
    ],
  },

  // Production optimizations
  compiler: {
    removeConsole: process.env["NODE_ENV"] === "production",
  },

  // Image optimization
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co", // Spotify images
      },
      {
        protocol: "https",
        hostname: "s1.ticketm.net", // Ticketmaster images
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com", // Placeholder images
      },
    ],
  },

  webpack: (config, { isServer }) => {
    // Suppress OpenTelemetry critical dependency warnings
    if (!isServer) {
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        {
          module: /@opentelemetry\/instrumentation/,
          message: /Critical dependency/,
        },
      ];

    }

    // Aggressive bundle splitting optimizations
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          maxInitialRequests: 30,
          maxAsyncRequests: 30,
          minSize: 20000,
          maxSize: 200000,
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunk (React ecosystem)
            framework: {
              name: "framework",
              chunks: "all",
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
              reuseExistingChunk: true,
            },
            // Design system - smaller chunks
            radixCore: {
              name: "radix-core",
              test: /[\\/]node_modules[\\/](@radix-ui[\\/]react-(avatar|button|dialog|dropdown-menu|input|tabs))[\\/]/,
              priority: 35,
              chunks: "all",
              enforce: true,
              reuseExistingChunk: true,
            },
            radixExtended: {
              name: "radix-extended",
              test: /[\\/]node_modules[\\/](@radix-ui[\\/]react-(badge|card|popover|command|select))[\\/]/,
              priority: 34,
              chunks: "all",
              enforce: true,
              reuseExistingChunk: true,
            },
            // Lucide icons - separate chunk
            icons: {
              name: "icons",
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              priority: 33,
              chunks: "all",
              enforce: true,
              reuseExistingChunk: true,
            },
            // Charts and visualization
            charts: {
              name: "charts",
              test: /[\\/]node_modules[\\/](recharts|d3-)[\\/]/,
              priority: 32,
              chunks: "all",
              enforce: true,
              reuseExistingChunk: true,
            },
            // Authentication and API
            auth: {
              name: "auth",
              test: /[\\/]node_modules[\\/](@supabase|otplib)[\\/]/,
              priority: 31,
              chunks: "all",
              enforce: true,
              reuseExistingChunk: true,
            },
            // Utilities and helpers
            utils: {
              name: "utils",
              test: /[\\/]node_modules[\\/](clsx|tailwind-merge|class-variance-authority|date-fns)[\\/]/,
              priority: 30,
              chunks: "all",
              enforce: true,
              reuseExistingChunk: true,
            },
            // Animation libraries
            animation: {
              name: "animation",
              test: /[\\/]node_modules[\\/](framer-motion|@hello-pangea)[\\/]/,
              priority: 29,
              chunks: "all",
              enforce: true,
              reuseExistingChunk: true,
            },
            // Common chunk for shared modules (smaller threshold)
            commons: {
              name: "commons",
              minChunks: 2,
              priority: 10,
              chunks: "all",
              enforce: true,
              reuseExistingChunk: true,
              maxSize: 150000,
            },
          },
        },
        runtimeChunk: {
          name: "runtime",
        },
        moduleIds: "deterministic",
      };
    }

    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
