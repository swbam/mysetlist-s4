import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Get Supabase credentials with fallbacks
const getSupabaseUrl = () => {
  return process.env['NEXT_PUBLIC_SUPABASE_URL'] || 
    'https://yzwkimtdaabyjbpykquu.supabase.co';
};

const getSupabaseAnonKey = () => {
  return process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk0NDQ2NzAsImV4cCI6MjA0NTAyMDY3MH0.JpQbmFj7H8P9JN74_uqr8bKMZfqPOIMH5j9pFMh3NZA';
};

const getSupabaseServiceRoleKey = () => {
  return process.env['SUPABASE_SERVICE_ROLE_KEY'] || 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTQ0NDY3MCwiZXhwIjoyMDQ1MDIwNjcwfQ.6lCBSPxerFdHqOIkTyKOoCtrrmgortHdMj85WeJVGHk';
};

export const createSupabaseServerClient = () => {
  const cookieStore = cookies();

  return createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
};

export const createSupabaseAdminClient = () => {
  return createServerClient(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      cookies: {
        get() { return undefined; },
        set() {},
        remove() {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};
