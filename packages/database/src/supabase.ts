import { createClient } from "@supabase/supabase-js";

// Get Supabase credentials with fallbacks - trim to remove newlines/whitespace
const getSupabaseUrl = () => {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://yzwkimtdaabyjbpykquu.supabase.co"
  ).trim();
};

const getSupabaseServiceRoleKey = () => {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTQ0NDY3MCwiZXhwIjoyMDQ1MDIwNjcwfQ.6lCBSPxerFdHqOIkTyKOoCtrrmgortHdMj85WeJVGHk"
  ).trim();
};

export const createSupabaseAdminClient = () => {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
