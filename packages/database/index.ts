// Re-export database client and utilities
export { db, getDb, sql, eq, and, or, desc, asc, ilike, isNull, isNotNull } from './src/client';
export type { Database } from './src/client';

// Re-export from main index
export { testConnection } from './src/index';

// Re-export all schema tables
export * from './src/schema';

// Re-export realtime functionality
export { realtimeManager } from './src/realtime';
export type { RealtimeManager } from './src/realtime';

// Re-export Supabase client helpers
export { createSupabaseBrowserClient } from './src/supabase-client';
export { createSupabaseAdminClient, createSupabaseServerClient } from './src/supabase';
