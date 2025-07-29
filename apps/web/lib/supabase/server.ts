import { createSupabaseAdminClient } from "@repo/database";
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  // Check if we're in a request context (not during build time)
  const isRequestContext =
    typeof window === "undefined" && process.env.NODE_ENV !== "production"
      ? true // In development, assume request context
      : Boolean(process.env.NEXT_PHASE !== "phase-production-build");

  const supabaseUrl =
    process.env["NEXT_PUBLIC_SUPABASE_URL"] ||
    "https://yzwkimtdaabyjbpykquu.supabase.co";
  const supabaseAnonKey =
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk0NDQ2NzAsImV4cCI6MjA0NTAyMDY3MH0.JpQbmFj7H8P9JN74_uqr8bKMZfqPOIMH5j9pFMh3NZA";

  // During build time or when cookies are not available, return admin client
  if (!isRequestContext) {
    return createSupabaseAdminClient();
  }

  try {
    return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        async get(name: string) {
          try {
            const cookieStore = await cookies();
            return cookieStore.get(name)?.value;
          } catch (error) {
            // Not in request context (build time), return undefined
            console.warn(`Unable to get cookie ${name}:`, error);
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
            console.warn(`Unable to set cookie ${name}:`, error);
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component or build time.
            // This can be ignored if you have middleware refreshing user sessions.
            console.warn(`Unable to remove cookie ${name}:`, error);
          }
        },
      },
    });
  } catch (error) {
    // Fallback to admin client for build time or when cookies aren't available
    console.warn(
      "Failed to create server client, falling back to admin client:",
      error,
    );
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
