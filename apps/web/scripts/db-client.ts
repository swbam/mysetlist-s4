import * as path from 'node:path';
import * as schema from '@repo/database/src/schema';
import * as dotenv from 'dotenv';
// Database client for scripts - without server-only restriction
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is required. Please check your .env file.'
  );
}

// Create postgres connection
const queryClient = postgres(DATABASE_URL, {
  max: 1,
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
});

// Create drizzle instance
export const db = drizzle(queryClient, { schema });

// Export sql for raw queries
export { sql } from 'drizzle-orm';
