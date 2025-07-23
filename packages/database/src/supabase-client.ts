import { createBrowserClient } from '@supabase/ssr';

// Dynamic env import with fallback
let supabaseUrl: string | undefined;
let supabaseAnonKey: string | undefined;

try {
  const envModule = require('@repo/env');
  supabaseUrl = envModule.env?.NEXT_PUBLIC_SUPABASE_URL;
  supabaseAnonKey = envModule.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
} catch (error) {
  console.warn('Failed to import @repo/env, using process.env fallback');
}

// Fallback to process.env - never use hardcoded values
supabaseUrl = supabaseUrl || process.env['NEXT_PUBLIC_SUPABASE_URL'];
supabaseAnonKey = supabaseAnonKey || process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

export const createSupabaseBrowserClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key are required');
  }
  
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
};