import type { Config } from 'drizzle-kit';

if (!process.env['DATABASE_URL']) {
  throw new Error(
    'DATABASE_URL environment variable is required for database migrations'
  );
}

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env['DATABASE_URL'],
  },
  verbose: true,
  strict: false, // disable interactive prompts to allow non-interactive CI migrations
  // @ts-ignore - property not in Config type but supported at runtime
  extensionsFilters: ['postgis'],
} satisfies Config;
