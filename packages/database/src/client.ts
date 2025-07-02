import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { keys } from '../keys';

const env = keys();
const connectionString = env.DATABASE_URL;

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 });

// For queries
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

// Re-export the Drizzle SQL template tag so downstream packages can
// reference the *same* instance/version and avoid private-property
// mismatches between multiple installations.
export { sql } from 'drizzle-orm';

export type Database = typeof db;