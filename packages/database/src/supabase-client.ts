import { createBrowserClient } from "@supabase/ssr";

// Dynamic env import with fallback
let supabaseUrl: string | undefined;
let supabaseAnonKey: string | undefined;

try {
  const envModule = require("@repo/env");
  supabaseUrl = envModule.env?.NEXT_PUBLIC_SUPABASE_URL;
  supabaseAnonKey = envModule.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
} catch (error) {
  console.warn("Failed to import @repo/env, using process.env fallback");
}

// Fallback to process.env or hardcoded values
supabaseUrl =
  supabaseUrl ||
  process.env["NEXT_PUBLIC_SUPABASE_URL"] ||
  "https://yzwkimtdaabyjbpykquu.supabase.co";

supabaseAnonKey =
  supabaseAnonKey ||
  process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk0NDQ2NzAsImV4cCI6MjA0NTAyMDY3MH0.JpQbmFj7H8P9JN74_uqr8bKMZfqPOIMH5j9pFMh3NZA";

export const createSupabaseBrowserClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key are required");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};
