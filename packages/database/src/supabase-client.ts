import { createBrowserClient } from '@supabase/ssr';
import { env } from '@repo/env';

export const createSupabaseBrowserClient = () => {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};