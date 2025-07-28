import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  
  // Turbopack configuration for optimal development performance
  turbopack: {
    // Enable memory optimizations for large applications
    memoryLimit: 4096, // 4GB memory limit
    
    // Configure module resolution for monorepo
    resolveAlias: {
      "@repo/design-system": "./packages/design-system/src",
      "@repo/database": "./packages/database/src", 
      "@repo/auth": "./packages/auth/src",
      "@repo/external-apis": "./packages/external-apis/src",
    },
    
    // Enable tree shaking optimizations
    treeShaking: true,
    
    // Optimize for development speed
    minify: false,
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
