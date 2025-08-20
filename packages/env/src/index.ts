import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Database
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url().optional(),

    // Supabase (required for real-time functionality)
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_JWT_SECRET: z.string().optional(),

    // External APIs
    SPOTIFY_CLIENT_ID: z.string().optional(),
    SPOTIFY_CLIENT_SECRET: z.string().optional(),
    TICKETMASTER_API_KEY: z.string().optional(),
    SETLISTFM_API_KEY: z.string().optional(),

    // Redis (optional)
    REDIS_URL: z.string().optional(),
    REDIS_HOST: z.string().optional(),
    REDIS_PORT: z.preprocess(
      (v) => (v ? Number(v) : undefined),
      z.number().optional(),
    ),
    REDIS_USERNAME: z.string().optional(),
    REDIS_PASSWORD: z.string().optional(),

    // Email
    RESEND_API_KEY: z.string().optional(),

    // Security
    CRON_SECRET: z.string().optional(),
    JWT_SECRET: z.string().optional(),

    // Node environment
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  client: {
    // Public environment variables
    NEXT_PUBLIC_URL: z.string().url().optional(),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_WEB_URL: z.string().url().optional(),
    NEXT_PUBLIC_API_URL: z.string().url().optional(),
    NEXT_PUBLIC_DOCS_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
    NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
    NEXT_PUBLIC_LOG_LEVEL: z.string().optional(),
  },
  runtimeEnv: {
    // Server
    DATABASE_URL: process.env["DATABASE_URL"],
    DIRECT_URL: process.env["DIRECT_URL"],
    SUPABASE_URL: process.env["SUPABASE_URL"],
    SUPABASE_ANON_KEY: process.env["SUPABASE_ANON_KEY"],
    SUPABASE_SERVICE_ROLE_KEY: process.env["SUPABASE_SERVICE_ROLE_KEY"],
    SUPABASE_JWT_SECRET: process.env["SUPABASE_JWT_SECRET"],
    SPOTIFY_CLIENT_ID: process.env["SPOTIFY_CLIENT_ID"],
    SPOTIFY_CLIENT_SECRET: process.env["SPOTIFY_CLIENT_SECRET"],
    TICKETMASTER_API_KEY: process.env["TICKETMASTER_API_KEY"],
    SETLISTFM_API_KEY: process.env["SETLISTFM_API_KEY"],
    REDIS_URL: process.env["REDIS_URL"],
    REDIS_HOST: process.env["REDIS_HOST"],
    REDIS_PORT: process.env["REDIS_PORT"] as any,
    REDIS_USERNAME: process.env["REDIS_USERNAME"],
    REDIS_PASSWORD: process.env["REDIS_PASSWORD"],
    RESEND_API_KEY: process.env["RESEND_API_KEY"],
    CRON_SECRET: process.env["CRON_SECRET"],
    JWT_SECRET: process.env["JWT_SECRET"],
    NODE_ENV: process.env["NODE_ENV"],

    // Client
    NEXT_PUBLIC_URL: process.env["NEXT_PUBLIC_URL"],
    NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"],
    NEXT_PUBLIC_WEB_URL: process.env["NEXT_PUBLIC_WEB_URL"],
    NEXT_PUBLIC_API_URL: process.env["NEXT_PUBLIC_API_URL"],
    NEXT_PUBLIC_DOCS_URL: process.env["NEXT_PUBLIC_DOCS_URL"],
    NEXT_PUBLIC_SUPABASE_URL: process.env["NEXT_PUBLIC_SUPABASE_URL"],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID: process.env["NEXT_PUBLIC_SPOTIFY_CLIENT_ID"],
    NEXT_PUBLIC_POSTHOG_KEY: process.env["NEXT_PUBLIC_POSTHOG_KEY"],
    NEXT_PUBLIC_POSTHOG_HOST: process.env["NEXT_PUBLIC_POSTHOG_HOST"],
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env["NEXT_PUBLIC_GA_MEASUREMENT_ID"],
    NEXT_PUBLIC_LOG_LEVEL: process.env["NEXT_PUBLIC_LOG_LEVEL"],
  },
  skipValidation: !!process.env["SKIP_ENV_VALIDATION"],
});

export type Env = typeof env;
