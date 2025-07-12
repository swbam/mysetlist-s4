import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const keys = () =>
  createEnv({
    server: {
      DATABASE_URL: z.string().url(),
      SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
      SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
    },
    client: {
      NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
      NEXT_PUBLIC_SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
    },
    runtimeEnv: {
      DATABASE_URL: process.env['DATABASE_URL'],
      SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'],
      NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
      NEXT_PUBLIC_SPOTIFY_CLIENT_ID: process.env['NEXT_PUBLIC_SPOTIFY_CLIENT_ID'],
      SPOTIFY_CLIENT_SECRET: process.env['SPOTIFY_CLIENT_SECRET'],
    },
    skipValidation: !!process.env['SKIP_ENV_VALIDATION'],
  });
