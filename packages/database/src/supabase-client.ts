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
    const missingVars: string[] = [];
    if (!supabaseUrl) missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!supabaseAnonKey) missingVars.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    
    throw new Error(
      `🔴 Missing required Supabase environment variables: ${missingVars.join(", ")}. ` +
      `Please check your .env.local file and ensure these are set to valid Supabase values.`
    );
  }
  
  // Check for placeholder values
  if (supabaseUrl.includes("your_supabase") || supabaseAnonKey.includes("your_supabase")) {
    throw new Error(
      "🔴 Supabase environment variables contain placeholder values. " +
      "Please replace 'your_supabase_project_url' and 'your_supabase_anon_key' with actual values from your Supabase project."
    );
  }

  return { supabaseUrl, supabaseAnonKey };
};

export const createSupabaseBrowserClient = () => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};
