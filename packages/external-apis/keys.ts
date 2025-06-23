import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const keys = () =>
  createEnv({
    server: {
      SPOTIFY_CLIENT_SECRET: z.string().min(1),
      TICKETMASTER_API_KEY: z.string().min(1),
      SETLIST_FM_API_KEY: z.string().min(1),
    },
    client: {
      NEXT_PUBLIC_SPOTIFY_CLIENT_ID: z.string().min(1),
    },
    runtimeEnv: {
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || 'feaf0fc901124b839b11e02f97d18a8d',
      NEXT_PUBLIC_SPOTIFY_CLIENT_ID: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '2946864dc822469b9c672292ead45f43',
      TICKETMASTER_API_KEY: process.env.TICKETMASTER_API_KEY || 'k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b',
      SETLIST_FM_API_KEY: process.env.SETLIST_FM_API_KEY || 'xkutflW-aRy_Df9rF4OkJyCsHBYN88V37EBL',
    },
  });