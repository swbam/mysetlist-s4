import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    server: {
      SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
      TICKETMASTER_API_KEY: z.string().min(1).optional(),
      SETLIST_FM_API_KEY: z.string().min(1).optional(),
    },
    client: {
      NEXT_PUBLIC_SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
    },
    runtimeEnv: {
      SPOTIFY_CLIENT_SECRET: process.env['SPOTIFY_CLIENT_SECRET'],
      NEXT_PUBLIC_SPOTIFY_CLIENT_ID: process.env['NEXT_PUBLIC_SPOTIFY_CLIENT_ID'],
      TICKETMASTER_API_KEY: process.env['TICKETMASTER_API_KEY'],
      SETLIST_FM_API_KEY: process.env['SETLIST_FM_API_KEY'],
    },
  });
