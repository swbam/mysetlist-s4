import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials with fallbacks
const getSupabaseUrl = () => {
  return process.env['NEXT_PUBLIC_SUPABASE_URL'] || 
    'https://yzwkimtdaabyjbpykquu.supabase.co';
};

const getSupabaseServiceRoleKey = () => {
  return process.env['SUPABASE_SERVICE_ROLE_KEY'] || 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTQ0NDY3MCwiZXhwIjoyMDQ1MDIwNjcwfQ.6lCBSPxerFdHqOIkTyKOoCtrrmgortHdMj85WeJVGHk';
};

export const createSupabaseAdminClient = () => {
  return createClient(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};