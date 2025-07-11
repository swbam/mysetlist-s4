import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '~/env';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
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
                cookieStore.set(name, value, cookieOptions);
              } else {
                cookieStore.set(name, value);
              }
            });
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

export async function createServiceClient() {
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
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
