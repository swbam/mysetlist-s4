'use client';

import { createBrowserClient } from '@supabase/ssr';
import { keys } from './keys';

const env = keys();

export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export type { Session, User } from '@supabase/supabase-js';
