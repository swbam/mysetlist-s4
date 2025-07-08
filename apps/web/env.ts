import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

// Import package environment configurations that exist
import { keys as auth } from '@repo/auth/keys';
import { keys as database } from '@repo/database/keys';
import { keys as nextConfig } from '@repo/next-config/keys';

export const env = createEnv({
  extends: [auth(), database(), nextConfig()],
  server: {
    // Authentication
    NEXTAUTH_URL: z.string().url().optional(),
    NEXTAUTH_SECRET: z.string().min(32),

    // External APIs
    TICKETMASTER_API_KEY: z.string().min(1),
    SETLISTFM_API_KEY: z.string().min(1).optional(),

    // Cron job security
    CRON_SECRET: z.string().min(1).optional(),

    // Email
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_SYSTEM_TOKEN: z.string().min(1).optional(),

    // Admin configuration
    ADMIN_USER_IDS: z.string().optional(),

    // Webhooks
    TICKETMASTER_WEBHOOK_SECRET: z.string().min(1).optional(),

    // Analytics & Monitoring
    POSTHOG_API_KEY: z.string().min(1).optional(),

    // Feature Flags
    FLAGSMITH_ENVIRONMENT_KEY: z.string().min(1).optional(),

    // Redis/Caching
    REDIS_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

    // Performance
    EDGE_CONFIG: z.string().min(1).optional(),
  },

  client: {
    // Public URLs (ensuring these are available on client)
    NEXT_PUBLIC_DOCS_URL: z.string().url().optional(),

    // Analytics
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),

    // Feature Flags
    NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_KEY: z.string().min(1).optional(),

    // Performance
    NEXT_PUBLIC_ENABLE_ANALYTICS: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: z
      .string()
      .transform((val) => val === 'true')
      .optional(),

    // Asset optimization
    NEXT_PUBLIC_ASSET_PREFIX: z.string().optional(),
  },

  runtimeEnv: {
    // Server
    NEXTAUTH_URL: process.env['NEXTAUTH_URL'],
    NEXTAUTH_SECRET: process.env['NEXTAUTH_SECRET'],
    TICKETMASTER_API_KEY: process.env['TICKETMASTER_API_KEY'],
    SETLISTFM_API_KEY: process.env['SETLISTFM_API_KEY'],
    CRON_SECRET: process.env['CRON_SECRET'],
    RESEND_API_KEY: process.env['RESEND_API_KEY'],
    EMAIL_SYSTEM_TOKEN: process.env['EMAIL_SYSTEM_TOKEN'],
    ADMIN_USER_IDS: process.env['ADMIN_USER_IDS'],
    TICKETMASTER_WEBHOOK_SECRET: process.env['TICKETMASTER_WEBHOOK_SECRET'],
    POSTHOG_API_KEY: process.env['POSTHOG_API_KEY'],
    FLAGSMITH_ENVIRONMENT_KEY: process.env['FLAGSMITH_ENVIRONMENT_KEY'],
    REDIS_URL: process.env['REDIS_URL'],
    UPSTASH_REDIS_REST_URL: process.env['UPSTASH_REDIS_REST_URL'],
    UPSTASH_REDIS_REST_TOKEN: process.env['UPSTASH_REDIS_REST_TOKEN'],
    EDGE_CONFIG: process.env['EDGE_CONFIG'],

    // Client
    NEXT_PUBLIC_DOCS_URL: process.env['NEXT_PUBLIC_DOCS_URL'],
    NEXT_PUBLIC_POSTHOG_KEY: process.env['NEXT_PUBLIC_POSTHOG_KEY'],
    NEXT_PUBLIC_POSTHOG_HOST: process.env['NEXT_PUBLIC_POSTHOG_HOST'],
    NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_KEY:
      process.env['NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_KEY'],
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env['NEXT_PUBLIC_ENABLE_ANALYTICS'],
    NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING:
      process.env['NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING'],
    NEXT_PUBLIC_ASSET_PREFIX: process.env['NEXT_PUBLIC_ASSET_PREFIX'],
  },

  skipValidation: !!process.env['SKIP_ENV_VALIDATION'],
});

// Server-side environment checks (only access on server-side)
export const isDevelopment = process.env['NODE_ENV'] === 'development';
export const isProduction = process.env['NODE_ENV'] === 'production';

// Client-safe performance configurations (only using client-side variables)
export const performanceConfig = {
  enableAnalytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS ?? isProduction,
  enablePerformanceMonitoring:
    env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING ?? isProduction,
  posthogEnabled: !!env.NEXT_PUBLIC_POSTHOG_KEY,
};

// Server-only cache configuration - export as function to prevent client access
export const getServerCacheConfig = () => ({
  redisEnabled: !!env.REDIS_URL || !!env.UPSTASH_REDIS_REST_URL,
  edgeConfigEnabled: !!env.EDGE_CONFIG,
  defaultTTL: isProduction ? 3600 : 60, // 1 hour in prod, 1 minute in dev
  staleWhileRevalidate: isProduction ? 86400 : 300, // 24 hours in prod, 5 minutes in dev
});

// Client-safe API configuration (only using client-side variables)
export const apiConfig = {
  baseUrl: env.NEXT_PUBLIC_API_URL || env.NEXT_PUBLIC_APP_URL,
  timeout: isProduction ? 30000 : 60000, // 30s in prod, 60s in dev
  retries: isProduction ? 3 : 1,
};
