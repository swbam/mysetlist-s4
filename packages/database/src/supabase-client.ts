import { createBrowserClient } from "@supabase/ssr";

// Lazy initialization of Supabase configuration
// This prevents build-time errors when environment variables are not available
const getSupabaseConfig = () => {
  // Env-only configuration. Do not ship hardcoded defaults in production.
  let supabaseUrl: string | undefined;
  let supabaseAnonKey: string | undefined;

  try {
    const envModule = require("@repo/env");
    supabaseUrl = envModule.env?.NEXT_PUBLIC_SUPABASE_URL?.trim();
    supabaseAnonKey = envModule.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  } catch {
    // Fallback to process.env only - trim to remove newlines/whitespace
    supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']?.trim();
    supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']?.trim();
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return { supabaseUrl, supabaseAnonKey };
};

export const createSupabaseBrowserClient = () => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};
