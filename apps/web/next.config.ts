import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
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
