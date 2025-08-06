import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  
  // Production optimization features  
  experimental: {
    // Enable React 19 optimizations
    ppr: false, // Partial Prerendering disabled for compatibility
    optimizeServerReact: true,
    // Enable optimizations for bundle size
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-icons",
      "recharts",
      "@hello-pangea/dnd",
    ],
  },
  
  // Turbopack configuration (stable as of Next.js 15)
  turbopack: {
    resolveAlias: {
      "@repo/design-system": "./packages/design-system/src",
      "@repo/database": "./packages/database/src", 
      "@repo/auth": "./packages/auth/src",
      "@repo/external-apis": "./packages/external-apis/src",
    },
  },
  
  // Bundle optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  
  // Image optimization
  images: {
    formats: ["image/webp", "image/avif"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co", // Spotify images
      },
      {
        protocol: "https", 
        hostname: "s1.ticketm.net", // Ticketmaster images
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

    // Bundle splitting optimizations
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          chunks: "all",
          cacheGroups: {
            ...config.optimization?.splitChunks?.cacheGroups,
            // Separate vendor chunk for heavy libraries
            vendor: {
              test: /[\/]node_modules[\/]/,
              name: "vendors",
              priority: 10,
              chunks: "all",
            },
            // Separate UI framework chunk
            ui: {
              test: /[\/]node_modules[\/](@radix-ui|@hello-pangea|framer-motion)[\/]/,
              name: "ui-framework",
              priority: 20,
              chunks: "all",
            },
            // Separate charts/visualization chunk
            charts: {
              test: /[\/]node_modules[\/](recharts|lucide-react)[\/]/,
              name: "charts",
              priority: 20,
              chunks: "all",
            },
          },
        },
      };
    }
    
    return config;
  },
};

export default nextConfig;
