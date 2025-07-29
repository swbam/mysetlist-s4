import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  // Enable experimental optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      "@repo/design-system",
      "@repo/database",
      "@repo/auth",
      "@repo/external-apis",
      "lucide-react",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tabs",
      "@radix-ui/react-popover",
      "@radix-ui/react-avatar",
      "@radix-ui/react-command",
      "@supabase/supabase-js",
      "@supabase/auth-helpers-nextjs",
      "framer-motion",
    ],
  },

  // Image optimization
  images: {
    domains: ["i.scdn.co", "s1.ticketm.net", "images.unsplash.com"],
    formats: ["image/avif", "image/webp"],
  },

  // Production optimizations
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Turbopack configuration for optimal development performance
  turbopack: {
    // Configure module resolution for monorepo
    resolveAlias: {
      "@repo/design-system": "./packages/design-system/src",
      "@repo/database": "./packages/database/src",
      "@repo/auth": "./packages/auth/src",
      "@repo/external-apis": "./packages/external-apis/src",
    },
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
      
      // Optimize chunks
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunk
            framework: {
              name: "framework",
              chunks: "all",
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Design system chunk
            designSystem: {
              name: "design-system",
              test: /[\\/]@repo[\\/]design-system[\\/]|[\\/]@radix-ui[\\/]|[\\/]class-variance-authority[\\/]|[\\/]clsx[\\/]|[\\/]tailwind-merge[\\/]/,
              priority: 30,
              reuseExistingChunk: true,
            },
            // Supabase chunk
            supabase: {
              name: "supabase",
              test: /[\\/]@supabase[\\/]/,
              priority: 20,
              reuseExistingChunk: true,
            },
            // Common chunk for shared modules
            commons: {
              name: "commons",
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
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

export default nextConfig;
