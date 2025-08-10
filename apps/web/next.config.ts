import type { NextConfig } from "next";

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
    removeConsole: process.env.NODE_ENV === "production",
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

    // Bundle splitting optimizations (optimized for Vercel)
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          chunks: "all",
          maxInitialRequests: 20,
          maxAsyncRequests: 20,
          cacheGroups: {
            ...config.optimization?.splitChunks?.cacheGroups,
            // Separate vendor chunk for heavy libraries
            vendor: {
              test: /[\/]node_modules[\/]/,
              name: "vendors",
              priority: 10,
              chunks: "all",
              enforce: true,
              reuseExistingChunk: true,
            },
            // Separate UI framework chunk
            ui: {
              test: /[\/]node_modules[\/](@radix-ui|@hello-pangea|framer-motion)[\/]/,
              name: "ui-framework",
              priority: 20,
              chunks: "all",
              enforce: true,
              reuseExistingChunk: true,
            },
            // Separate charts/visualization chunk
            charts: {
              test: /[\/]node_modules[\/](recharts|lucide-react)[\/]/,
              name: "charts",
              priority: 20,
              chunks: "all",
              enforce: true,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },
};

export default nextConfig;
