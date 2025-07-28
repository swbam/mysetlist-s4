import { createBrowserClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { keys } from "../../keys"

// Client-side Supabase instance
export function createSupabaseClient() {
  const env = keys()
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  )
}

// Server-side admin client for administrative operations
export function createSupabaseAdmin() {
  const env = keys()
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

export const AUTH_CONFIG = {
  redirectUrls: {
    signIn: "/dashboard",
    signOut: "/",
    callback: "/auth/callback",
  },
  oauth: {
    spotify: {
      scopes:
        "user-read-email user-read-private user-library-read user-top-read user-read-recently-played",
    },
    google: {
      scopes: "email profile",
    },
  },
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    refreshThreshold: 60 * 60, // 1 hour
  },
} as const
