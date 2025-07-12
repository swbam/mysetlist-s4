import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl =
    process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://placeholder.supabase.co';
  const supabaseAnonKey =
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.M9jrxyvPLkUxWgOYSf5dNdJ8v_eR8Ch_5gLcKqxM8Sc';

  // Check if we're using placeholder values
  if (supabaseUrl === 'https://placeholder.supabase.co') {
    console.warn(
      'Using placeholder Supabase URL. Please set NEXT_PUBLIC_SUPABASE_URL environment variable.'
    );
  }

  try {
    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
        timeout: 10000, // 10 second timeout for realtime connection
      },
    });
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    // Return a client even if creation fails to prevent complete app crash
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
}
