import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false }, // Enable TS checking in production
  eslint: { ignoreDuringBuilds: false },
  
  // Vercel deployment configuration
  output: "standalone",
  
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
  
  // Remove Turbopack config for Vercel deployment compatibility
  // Turbopack aliases cause issues in production builds
  
  // Bundle optimization
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
