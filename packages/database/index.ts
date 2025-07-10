// Export database client and utilities
export { db, getDb, migrationClient } from './src/client';
export type { Database } from './src/client';
export {
  sql,
  eq,
  and,
  or,
  desc,
  asc,
  ilike,
  isNull,
  isNotNull,
} from 'drizzle-orm';

// Export schema
export * from './src/schema';

// Export queries
export * from './src/queries';

// Export other utilities
export * from './src/supabase';
export * from './src/realtime';

// Export API keys table
export { apiKeys } from './api-keys';
