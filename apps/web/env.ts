import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Import package environment configurations that exist
import { keys as auth } from "@repo/auth/keys";
import { keys as nextConfig } from "@repo/next-config/keys";

export const env = createEnv({
  extends: [...(process.env.SKIP_ENV_VALIDATION ? [] : [auth(), nextConfig()])],
  server: {
    // Core external APIs
    TICKETMASTER_API_KEY: z.string().min(1),
    SPOTIFY_CLIENT_ID: z.string().optional(),
    SPOTIFY_CLIENT_SECRET: z.string().optional(),

    // Queue/Redis
    REDIS_URL: z.string().url().optional(),

    // Security/auth for internal jobs
    CRON_SECRET: z.string().optional(),
    SUPABASE_JWT_SECRET: z.string().optional(),
  },

  client: {
    // Public URLs and Supabase client
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_WEB_URL: z.string().url().optional(),
    NEXT_PUBLIC_API_URL: z.string().url().optional(),
    NEXT_PUBLIC_DOCS_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID: z.string().optional(),
  },

  runtimeEnv: {
    // Server
    TICKETMASTER_API_KEY: process.env.TICKETMASTER_API_KEY,
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    REDIS_URL: process.env.REDIS_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,

    // Client
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

export const isDevelopment = process.env.NODE_ENV === "development";
export const isProduction = process.env.NODE_ENV === "production";
