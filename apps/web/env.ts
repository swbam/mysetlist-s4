import { keys as database } from '@repo/database/keys';
import { keys as core } from '@repo/next-config/keys';
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  extends: [
    core(),
    database(),
  ],
  server: {
    // Supabase - JWT secret is optional for basic functionality
    SUPABASE_JWT_SECRET: z.string().min(1).optional(),
    
    // External APIs - all optional for core functionality
    SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
    SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
    TICKETMASTER_API_KEY: z.string().min(1).optional(),
    SETLISTFM_API_KEY: z.string().min(1).optional(),
    
    // Cron - optional for basic functionality
    CRON_SECRET: z.string().min(1).optional(),
  },
  client: {
    // App environment defaults to development if not set
    NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  },
  runtimeEnv: {
    // Server
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    TICKETMASTER_API_KEY: process.env.TICKETMASTER_API_KEY,
    SETLISTFM_API_KEY: process.env.SETLISTFM_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    
    // Client
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  },
});
