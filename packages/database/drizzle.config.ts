import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
  },
  verbose: true,
  strict: false, // disable interactive prompts to allow non-interactive CI migrations
  // @ts-ignore - property not in Config type but supported at runtime
  extensionsFilters: ["postgis"],
} satisfies Config;