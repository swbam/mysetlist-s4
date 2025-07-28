import { createClient } from "@supabase/supabase-js"

// Admin client for server-side operations without Next.js dependencies
export const createSupabaseAdminClientStandalone = () => {
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const supabaseServiceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export const supabaseAdmin = createSupabaseAdminClientStandalone()
