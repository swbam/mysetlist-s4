import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const keys = () =>
  createEnv({
    server: {
      SUPABASE_URL: z.string().url(),
      SUPABASE_ANON_KEY: z.string().min(1),
    },
    runtimeEnv: {
      SUPABASE_URL: process.env['SUPABASE_URL'],
      SUPABASE_ANON_KEY: process.env['SUPABASE_ANON_KEY'],
    },
  });
