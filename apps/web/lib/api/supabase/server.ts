import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@repo/env';

export function createClient() {
  return createServerClient(
    env["NEXT_PUBLIC_SUPABASE_URL"]!,
    env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    {
      cookies: {
        async getAll() {
          const cookieStore = await cookies();
          return cookieStore.getAll();
        },
        async setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[]
        ) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              if (options) {
                const cookieOptions = {
                  httpOnly: options.httpOnly,
                  secure: options.secure,
                  sameSite: options.sameSite as any,
                  maxAge: options.maxAge,
                  expires: options.expires ? new Date(options.expires) : undefined,
                  path: options.path,
                  domain: options.domain,
                };
                const cookieStore = await cookies();
                cookieStore.set(name, value, cookieOptions);
              } else {
                const cookieStore = await cookies();
                cookieStore.set(name, value);
              }
            }
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export function createServiceClient() {
  return createServerClient(
    env["NEXT_PUBLIC_SUPABASE_URL"]!,
    env["SUPABASE_SERVICE_ROLE_KEY"]!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Service role doesn't need cookies
        },
      },
    }
  );
}
