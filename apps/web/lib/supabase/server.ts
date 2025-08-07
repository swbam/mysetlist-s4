import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@repo/database";

export async function createClient() {
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required",
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async get(name: string) {
        try {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        } catch (error) {
          // Not in request context (build time), return undefined
          return undefined;
        }
      },
      async set(name: string, value: string, options: CookieOptions) {
        try {
          const cookieStore = await cookies();
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // The `set` method was called from a Server Component or build time.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
      async remove(name: string, options: CookieOptions) {
        try {
          const cookieStore = await cookies();
          cookieStore.set({ name, value: "", ...options });
        } catch (error) {
          // The `delete` method was called from a Server Component or build time.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

export async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user };
}

// For API routes that need user context (auth required)
export async function createAuthenticatedClient() {
  return await createClient();
}

// For API routes that don't need user context (public data, cron jobs, etc.)
export const createServiceClient = createSupabaseAdminClient;
