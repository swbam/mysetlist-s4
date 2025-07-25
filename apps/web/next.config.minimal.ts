import type { NextConfig } from 'next';

// Minimal configuration for build testing
const nextConfig: NextConfig = {
  // Disable strict checks for now
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Essential transpile packages only
  transpilePackages: ['@repo/design-system'],
  
  // Minimal settings
  compress: false,
  poweredByHeader: false,
  
  // Basic image config
  images: {
    domains: ['i.scdn.co', 's1.ticketm.net', 'images.unsplash.com'],
  },
  
  // Simple webpack config
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;