import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

import { env } from '@repo/env';

const globalForDrizzle = global as unknown as {
  db: ReturnType<typeof drizzle> | undefined;
};

const client = postgres(env.DATABASE_URL);
export const db = globalForDrizzle.db ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== 'production') globalForDrizzle.db = db;

export * from './schema';