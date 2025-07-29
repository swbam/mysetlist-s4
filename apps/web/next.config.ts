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
    }
    return config;
  },
};

export default nextConfig;
