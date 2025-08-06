import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  
  // Production optimization features  
  experimental: {
    // Enable React 19 optimizations
    ppr: false, // Partial Prerendering disabled for compatibility
    optimizeServerReact: true,
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
    return config;
  },
};

export default nextConfig;
