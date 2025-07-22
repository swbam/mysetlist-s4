import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@repo/database';

export async function createClient() {
  // Check if we're in a request context or build time
  try {
    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] || 
      'https://yzwkimtdaabyjbpykquu.supabase.co';
    const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk0NDQ2NzAsImV4cCI6MjA0NTAyMDY3MH0.JpQbmFj7H8P9JN74_uqr8bKMZfqPOIMH5j9pFMh3NZA';
    
    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          async get(name: string) {
            try {
              const cookieStore = await cookies();
              return cookieStore.get(name)?.value;
            } catch {
              // Not in request context (build time), return undefined
              return undefined;
            }
          },
          async set(name: string, value: string, options: CookieOptions) {
            try {
              const cookieStore = await cookies();
              cookieStore.set({ name, value, ...options });
            } catch {
              // The `set` method was called from a Server Component or build time.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
          async remove(name: string, options: CookieOptions) {
            try {
              const cookieStore = await cookies();
              cookieStore.set({ name, value: '', ...options });
            } catch {
              // The `delete` method was called from a Server Component or build time.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    );
  } catch {
    // Fallback to admin client for build time or when cookies aren't available
    return createSupabaseAdminClient();
  }
}

export async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user };
}

export const createServiceClient = createSupabaseAdminClient;
