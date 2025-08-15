import { createClient } from "@supabase/supabase-js";

// Get Supabase credentials - trim to remove newlines/whitespace
const getSupabaseUrl = () => {
  const url = process.env['SUPABASE_URL'] || process.env['NEXT_PUBLIC_SUPABASE_URL'];
  if (!url) {
    throw new Error(
      "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL must be set in environment variables"
    );
  }
  return url.trim();
};

const getSupabaseServiceRoleKey = () => {
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
    );
  }
  return key.trim();
};

export const createSupabaseAdminClient = () => {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
