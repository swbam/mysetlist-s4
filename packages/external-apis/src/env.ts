import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  TICKETMASTER_API_KEY: z.string().optional(),
  SETLISTFM_API_KEY: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export const env = schema.parse({
  DATABASE_URL: process.env['DATABASE_URL'],
  NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
  SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'],
  SPOTIFY_CLIENT_ID: process.env['SPOTIFY_CLIENT_ID'],
  SPOTIFY_CLIENT_SECRET: process.env['SPOTIFY_CLIENT_SECRET'],
  TICKETMASTER_API_KEY: process.env['TICKETMASTER_API_KEY'],
  SETLISTFM_API_KEY: process.env['SETLISTFM_API_KEY'],
  NODE_ENV: process.env['NODE_ENV'],
});

export type Env = typeof env;
