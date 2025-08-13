import { createBrowserClient } from "@supabase/ssr";

// Env-only configuration. Do not ship hardcoded defaults in production.
let supabaseUrl: string | undefined;
let supabaseAnonKey: string | undefined;

try {
  const envModule = require("@repo/env");
  supabaseUrl = envModule.env?.NEXT_PUBLIC_SUPABASE_URL?.trim();
  supabaseAnonKey = envModule.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
} catch {
  // Fallback to process.env only - trim to remove newlines/whitespace
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export const createSupabaseBrowserClient = () =>
  createBrowserClient(supabaseUrl as string, supabaseAnonKey as string);
